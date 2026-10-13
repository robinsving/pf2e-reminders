import { describe, it, expect, beforeEach, vi } from "vitest";
import { setSettings } from "./helpers";
import { getCandidateActors, getReminderTargets, MAX_CANDIDATES } from "../reminders/Candidates";

function makeActor(id, { owned = true, playerOwned = false, type = "character" } = {}) {
    return { id, type, uuid: `Actor.${id}`, name: `Actor ${id}`, hasPlayerOwner: playerOwned, testUserPermission: () => owned };
}

let user;

beforeEach(() => {
    setSettings();
    user = { isGM: false };
    game.combat = undefined;
    globalThis.canvas = undefined;
});

describe("getCandidateActors", () => {
    it("prefers selected tokens", () => {
        const selected = makeActor("a");
        game.combat = { combatants: [{ actor: makeActor("b") }] };
        globalThis.canvas = { tokens: { controlled: [{ actor: selected }] } };
        expect(getCandidateActors(user)).toEqual([selected]);
    });

    it("then the user's combatants, leaving out actors they do not own", () => {
        const mine = makeActor("a");
        game.combat = { combatants: [{ actor: mine }, { actor: makeActor("b", { owned: false }) }] };
        expect(getCandidateActors(user)).toEqual([mine]);
    });

    it("lists the GM's combatants without player-owned actors", () => {
        user.isGM = true;
        const npc = makeActor("a");
        game.combat = { combatants: [{ actor: npc }, { actor: makeActor("b", { playerOwned: true }) }] };
        expect(getCandidateActors(user)).toEqual([npc]);
    });

    it("then tokens on the scene, then the assigned character", () => {
        const onScene = makeActor("a");
        globalThis.canvas = { scene: { tokens: [{ actor: onScene }] } };
        expect(getCandidateActors(user)).toEqual([onScene]);

        globalThis.canvas = undefined;
        user.character = makeActor("c");
        expect(getCandidateActors(user)).toEqual([user.character]);
    });

    it("removes duplicates and caps the list", () => {
        const actors = Array.from({ length: 12 }, (_, i) => makeActor(String(i)));
        game.combat = { combatants: [...actors, ...actors].map((actor) => ({ actor })) };
        expect(getCandidateActors(user)).toHaveLength(MAX_CANDIDATES);
    });
});

describe("NPCs", () => {
    beforeEach(() => {
        user = { isGM: true };
        game.combat = undefined;
        globalThis.canvas = undefined;
    });

    function selectNpcAndPc() {
        const npc = makeActor("n", { type: "npc" });
        const pc = makeActor("p", { type: "character" });
        globalThis.canvas = { tokens: { controlled: [{ actor: npc }, { actor: pc }] } };
        return { npc, pc };
    }

    it("are left out of the candidates unless the GM turned NPC controls on", () => {
        const { pc } = selectNpcAndPc();
        expect(getCandidateActors(user)).toEqual([pc]);
    });

    it("are included when the GM turned NPC controls on", () => {
        const { npc, pc } = selectNpcAndPc();
        setSettings({ npcReminders: true });
        expect(getCandidateActors(user)).toEqual([npc, pc]);
        setSettings();
    });

    it("fall through to the next source when only NPCs are selected", () => {
        const npc = makeActor("n", { type: "npc" });
        const onScene = makeActor("s");
        globalThis.canvas = { tokens: { controlled: [{ actor: npc }] }, scene: { tokens: [{ actor: onScene }] } };
        expect(getCandidateActors(user)).toEqual([onScene]);
    });

    it("leave no targets when nothing else is left", () => {
        globalThis.canvas = { tokens: { controlled: [{ actor: makeActor("n", { type: "npc" }) }] } };
        expect(getReminderTargets(user)).toEqual([]);
    });
});

describe("getReminderTargets", () => {
    it("has no targets without candidates", () => {
        expect(getReminderTargets(user)).toEqual([]);
    });

    it("returns one named target per actor", () => {
        const actor = makeActor("a");
        user.character = actor;
        expect(getReminderTargets(user)).toEqual([{ actorUuid: "Actor.a", name: "Actor a" }]);
    });
});
