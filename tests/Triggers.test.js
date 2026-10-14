import { describe, it, expect } from "vitest";
import { triggerIconPlain, TRIGGER_CATEGORY_LABELS, TRIGGER_GROUPS, checkTriggersOf, DEFAULT_TRIGGER, supersedeGroup, getTrigger, triggerIcon, TRIGGERS, TRIGGERS_IN_FIRING_ORDER, triggerLabel, triggerOf } from "../reminders/Triggers";

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
        expect(TRIGGERS.map((trigger) => trigger.id)).toEqual(["turnStart", "turnEnd", "crit", "hit", "miss", "critMiss", "wasCritted", "wasHit", "wasMissed", "wasCritMissed", "saveCritSuccess", "saveSuccess", "saveFailure", "saveCritFailure", "saveAgainstCritSuccess", "saveAgainstSuccess", "saveAgainstFailure", "saveAgainstCritFailure"]);
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

    it("gives each kind of event one icon, and each outcome one colour class", () => {
        const icon = (id) => triggerIcon(id);
        const kindOf = (id) => icon(id).split(" ")[1];
        const colourOf = (id) => icon(id).split(" ")[2];
        // hitting, getting hit, saving and someone saving against you
        expect(["hit", "crit", "miss", "critMiss"].map(kindOf)).toEqual(Array(4).fill("fa-crosshairs"));
        expect(["wasHit", "wasCritted", "wasMissed", "wasCritMissed"].map(kindOf)).toEqual(Array(4).fill("fa-shield-halved"));
        expect(["saveSuccess", "saveCritSuccess", "saveFailure", "saveCritFailure"].map(kindOf)).toEqual(Array(4).fill("fa-heart-pulse"));
        expect(["saveAgainstSuccess", "saveAgainstCritSuccess", "saveAgainstFailure", "saveAgainstCritFailure"].map(kindOf)).toEqual(Array(4).fill("fa-wand-sparkles"));
        // the colour is PF2e's colour for the outcome, whatever the event
        for (const ids of [["hit", "wasHit", "saveSuccess", "saveAgainstSuccess"], ["crit", "wasCritted", "saveCritSuccess", "saveAgainstCritSuccess"], ["miss", "wasMissed", "saveFailure", "saveAgainstFailure"], ["critMiss", "wasCritMissed", "saveCritFailure", "saveAgainstCritFailure"]]) {
            expect(new Set(ids.map(colourOf)).size).toBe(1);
        }
        expect(colourOf("hit")).toBe("pf2e-reminders-success");
        expect(colourOf("crit")).toBe("pf2e-reminders-critical-success");
        expect(colourOf("miss")).toBe("pf2e-reminders-failure");
        expect(colourOf("critMiss")).toBe("pf2e-reminders-critical-failure");
    });

    it("can give a trigger icon without its outcome colour", () => {
        expect(triggerIconPlain("hit")).toBe("fa-solid fa-crosshairs");
        expect(triggerIconPlain("saveAgainstCritFailure")).toBe("fa-solid fa-wand-sparkles");
        expect(triggerIconPlain("turnEnd")).toBe(triggerIcon("turnEnd"));
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
        expect(ids(roll("criticalSuccess"))).toEqual(["crit", "hit", "wasCritted", "wasHit"]);
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

        it("a success fires save success for the one who saved and someone saved against you for the caster", () => {
            expect(ids(save("success"))).toEqual(["saveSuccess", "saveAgainstSuccess"]);
            expect(ids(save("criticalSuccess"))).toEqual(["saveCritSuccess", "saveSuccess", "saveAgainstCritSuccess", "saveAgainstSuccess"]);
            const [saver, caster] = checkTriggersOf(save("success"));
            expect(saver).toMatchObject({ actorUuid: "Actor.saver", tokenUuid: "Scene.s.Token.s" });
            expect(caster).toMatchObject({ actorUuid: "Actor.caster", tokenUuid: "Scene.s.Token.c" });
        });

        it("a failure fires save failure and someone failed against you, and a critical failure also the critical ones", () => {
            expect(ids(save("failure"))).toEqual(["saveFailure", "saveAgainstFailure"]);
            expect(ids(save("criticalFailure"))).toEqual(["saveFailure", "saveCritFailure", "saveAgainstFailure", "saveAgainstCritFailure"]);
        });

        it("fires nothing for a save without a DC, which has no outcome", () => {
            expect(ids(save(null))).toEqual([]);
        });

        it("fires only for the side the roll has an actor for, as when the source of the save is not known", () => {
            expect(ids(save("failure", { target: null }))).toEqual(["saveAgainstFailure"]);
            expect(ids(save("failure", { origin: null }))).toEqual(["saveFailure"]);
        });

        it("keeps attack and save triggers apart", () => {
            expect(ids(roll("failure"))).not.toContain("saveFailure");
            expect(ids(save("success"))).not.toContain("wasHit");
        });
    });

    it("gives the roll triggers a category, the same one the icon is made from, and the turn triggers none", () => {
        expect(TRIGGERS.filter((trigger) => trigger.kind === "turn").every((trigger) => trigger.category === undefined)).toBe(true);
        for (const trigger of TRIGGERS.filter((candidate) => candidate.kind === "check")) {
            expect(Object.keys(TRIGGER_CATEGORY_LABELS)).toContain(trigger.category);
        }
        expect(getTrigger("hit").category).toBe("hitting");
        expect(getTrigger("wasHit").category).toBe("gettingHit");
        expect(getTrigger("saveSuccess").category).toBe("saving");
        expect(getTrigger("saveAgainstSuccess").category).toBe("savedAgainst");
    });

    it("groups all turn triggers together and every attack trigger on its own", () => {
        expect(supersedeGroup("turnStart")).toBe(supersedeGroup("turnEnd"));
        expect(supersedeGroup("hit")).toBe("hit");
        expect(supersedeGroup("wasHit")).not.toBe(supersedeGroup("hit"));
    });
});
