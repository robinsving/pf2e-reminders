import { describe, it, expect } from "vitest";
import { attackTriggersOf, DEFAULT_TRIGGER, supersedeGroup, getTrigger, triggerIcon, TRIGGERS, TRIGGERS_IN_FIRING_ORDER, triggerLabel, triggerOf } from "../reminders/Triggers";

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
        expect(TRIGGERS.map((trigger) => trigger.id)).toEqual(["turnStart", "turnEnd", "hit", "crit", "wasHit", "wasCritted"]);
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

describe("attack triggers", () => {
    const roll = (outcome, extra = {}) => ({
        type: "attack-roll",
        outcome,
        origin: { actor: "Actor.attacker", token: "Scene.s.Token.a" },
        target: { actor: "Actor.defender", token: "Scene.s.Token.d" },
        ...extra,
    });
    const ids = (context) => attackTriggersOf(context).map(({ trigger }) => trigger.id);

    it("a hit fires hit for the attacker and was hit for the target", () => {
        expect(ids(roll("success"))).toEqual(["hit", "wasHit"]);
        expect(attackTriggersOf(roll("success")).map(({ actorUuid }) => actorUuid)).toEqual(["Actor.attacker", "Actor.defender"]);
        expect(attackTriggersOf(roll("success"))[0].tokenUuid).toBe("Scene.s.Token.a");
    });

    it("a critical hit fires the hit and the critical hit triggers on both sides", () => {
        expect(ids(roll("criticalSuccess"))).toEqual(["hit", "crit", "wasHit", "wasCritted"]);
    });

    it("misses fire nothing", () => {
        expect(ids(roll("failure"))).toEqual([]);
        expect(ids(roll("criticalFailure"))).toEqual([]);
    });

    it("ignores rolls that are not attacks and rolls without an outcome", () => {
        expect(ids(roll("success", { type: "saving-throw" }))).toEqual([]);
        expect(ids(roll(null))).toEqual([]);
        expect(ids(undefined)).toEqual([]);
    });

    it("skips a side the roll has no actor for, as when nothing was targeted", () => {
        expect(ids(roll("success", { target: null }))).toEqual(["hit"]);
    });

    it("groups all turn triggers together and every attack trigger on its own", () => {
        expect(supersedeGroup("turnStart")).toBe(supersedeGroup("turnEnd"));
        expect(supersedeGroup("hit")).toBe("hit");
        expect(supersedeGroup("wasHit")).not.toBe(supersedeGroup("hit"));
    });
});
