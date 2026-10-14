import { describe, it, expect } from "vitest";
import { TRIGGER_GROUPS, checkTriggersOf, DEFAULT_TRIGGER, supersedeGroup, getTrigger, triggerIcon, TRIGGERS, TRIGGERS_IN_FIRING_ORDER, triggerLabel, triggerOf } from "../reminders/Triggers";

const combat = { combatants: { get: (id) => ({ id }) } };
const previous = { combatantId: "prev" };
const current = { combatantId: "cur" };

describe("triggers", () => {
    it("turn start concerns the new combatant and turn end the previous one", () => {
        expect(getTrigger("turnStart").combatantOf(combat, previous, current).id).toBe("cur");
        expect(getTrigger("turnEnd").combatantOf(combat, previous, current).id).toBe("prev");
    });

    it("turn end has nobody to remind when there was no previous turn", () => {
        const empty = { combatants: { get: (id) => (id ? { id } : undefined) } };
        expect(getTrigger("turnEnd").combatantOf(empty, undefined, current)).toBeUndefined();
    });

    it("fires the end of a turn before the start of the next", () => {
        expect(TRIGGERS_IN_FIRING_ORDER.map((trigger) => trigger.id)).toEqual(["turnEnd", "turnStart"]);
        expect(TRIGGERS.map((trigger) => trigger.id)).toEqual(["turnStart", "turnEnd", "hit", "crit", "miss", "critMiss", "wasHit", "wasCritted", "wasMissed", "wasCritMissed", "saveSuccess", "saveCritSuccess", "saveFailure", "saveCritFailure"]);
    });

    it("puts every trigger in a known group, with the groups in the order of the triggers", () => {
        expect(TRIGGERS.every((trigger) => TRIGGER_GROUPS.includes(trigger.group))).toBe(true);
        expect([...new Set(TRIGGERS.map((trigger) => trigger.group))]).toEqual(TRIGGER_GROUPS);
    });

    it("treats reminders without a trigger as the default and unknown ids as the default trigger", () => {
        expect(DEFAULT_TRIGGER).toBe("turnStart");
        expect(triggerOf({})).toBe("turnStart");
        expect(triggerOf({ trigger: "turnEnd" })).toBe("turnEnd");
        expect(getTrigger("nonsense").id).toBe("turnStart");
    });

    it("has an icon per trigger", () => {
        expect(triggerIcon("turnStart")).toContain("hourglass-start");
        expect(triggerIcon("turnEnd")).toContain("hourglass-end");
    });

    it("has a localized label", () => {
        expect(triggerLabel("turnEnd")).toBe("REMINDERS.trigger.turnEnd");
    });
});

describe("check triggers", () => {
    const roll = (outcome, extra = {}) => ({
        type: "attack-roll",
        outcome,
        origin: { actor: "Actor.attacker", token: "Scene.s.Token.a" },
        target: { actor: "Actor.defender", token: "Scene.s.Token.d" },
        ...extra,
    });
    const ids = (context) => checkTriggersOf(context).map(({ trigger }) => trigger.id);

    it("a hit fires hit for the attacker and was hit for the target", () => {
        expect(ids(roll("success"))).toEqual(["hit", "wasHit"]);
        expect(checkTriggersOf(roll("success")).map(({ actorUuid }) => actorUuid)).toEqual(["Actor.attacker", "Actor.defender"]);
        expect(checkTriggersOf(roll("success"))[0].tokenUuid).toBe("Scene.s.Token.a");
    });

    it("a critical hit fires the hit and the critical hit triggers on both sides", () => {
        expect(ids(roll("criticalSuccess"))).toEqual(["hit", "crit", "wasHit", "wasCritted"]);
    });

    it("a miss fires miss for the attacker and was missed for the target", () => {
        expect(ids(roll("failure"))).toEqual(["miss", "wasMissed"]);
    });

    it("a critical miss fires the miss and the critical miss triggers on both sides", () => {
        expect(ids(roll("criticalFailure"))).toEqual(["miss", "critMiss", "wasMissed", "wasCritMissed"]);
    });

    it("ignores rolls that are not attacks or saves and rolls without an outcome", () => {
        expect(ids(roll("success", { type: "skill-check" }))).toEqual([]);
        expect(ids(roll(null))).toEqual([]);
        expect(ids(undefined)).toEqual([]);
    });

    it("skips a side the roll has no actor for, as when nothing was targeted", () => {
        expect(ids(roll("success", { target: null }))).toEqual(["hit"]);
    });

    describe("saving throws", () => {
        const save = (outcome, extra = {}) => ({
            type: "saving-throw",
            outcome,
            origin: { actor: "Actor.caster", token: "Scene.s.Token.c" },
            target: { actor: "Actor.saver", token: "Scene.s.Token.s" },
            ...extra,
        });

        it("a success fires save success, and a critical success also the critical one, for the one who saved, not for the caster", () => {
            expect(ids(save("success"))).toEqual(["saveSuccess"]);
            expect(ids(save("criticalSuccess"))).toEqual(["saveSuccess", "saveCritSuccess"]);
            expect(checkTriggersOf(save("success"))[0]).toMatchObject({ actorUuid: "Actor.saver", tokenUuid: "Scene.s.Token.s" });
        });

        it("a failure fires save failure, and a critical failure also the critical one", () => {
            expect(ids(save("failure"))).toEqual(["saveFailure"]);
            expect(ids(save("criticalFailure"))).toEqual(["saveFailure", "saveCritFailure"]);
        });

        it("fires nothing for a save without a DC, which has no outcome, or without an actor", () => {
            expect(ids(save(null))).toEqual([]);
            expect(ids(save("failure", { target: null }))).toEqual([]);
        });

        it("keeps attack and save triggers apart", () => {
            expect(ids(roll("failure"))).not.toContain("saveFailure");
            expect(ids(save("success"))).not.toContain("wasHit");
        });
    });

    it("groups all turn triggers together and every attack trigger on its own", () => {
        expect(supersedeGroup("turnStart")).toBe(supersedeGroup("turnEnd"));
        expect(supersedeGroup("hit")).toBe("hit");
        expect(supersedeGroup("wasHit")).not.toBe(supersedeGroup("hit"));
    });
});
