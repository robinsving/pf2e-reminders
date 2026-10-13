import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    setReminderTrigger, addCustomReminder, addReminder, clearAllData, findItemReminder, findItemReminders, getActorReminders, getReminders, getTurnReminders,
    isActorEnabled, isTurnOfUser, removeReminders, setActorEnabled, summarizeMessage, toggleItemReminder,
} from "../reminders/RemindersStorage";
import { makeDoc } from "./helpers";

describe("summarizeMessage", () => {
    it("prefers the card title", () => {
        const message = { content: "<div><h3>Sustain a Spell</h3><p>Long description</p></div>" };
        expect(summarizeMessage(message)).toBe("Sustain a Spell");
    });

    it("falls back to collapsed plain text", () => {
        expect(summarizeMessage({ content: "<p>Frightened   2\n for 1 round</p>" })).toBe("Frightened 2 for 1 round");
    });

    it("falls back to flavor when content is empty", () => {
        expect(summarizeMessage({ content: "", flavor: "Strike" })).toBe("Strike");
    });

    it("truncates long text", () => {
        const text = summarizeMessage({ content: `<p>${"a".repeat(500)}</p>` });
        expect(text).toHaveLength(200);
        expect(text.endsWith("…")).toBe(true);
    });
});

describe("reminder storage", () => {
    let user;
    beforeEach(() => { user = makeDoc(); });

    it("starts empty", () => {
        expect(getReminders(user)).toEqual([]);
    });

    it("adds reminders for an actor with the message speaker as source", async () => {
        await addReminder(user, { id: "m1", content: "<h3>Sustain</h3>", alias: "Gavilar" }, "Actor.a");
        const [reminder] = getReminders(user);
        expect(reminder).toMatchObject({ text: "Sustain", source: "Gavilar", messageId: "m1", actorUuid: "Actor.a" });
        expect(reminder.id).toBeDefined();
    });

    it("adds reminders without an actor", async () => {
        await addReminder(user, { id: "m1", content: "x" });
        expect(getReminders(user)[0].actorUuid).toBeUndefined();
    });

    it("removes only the given reminders", async () => {
        const first = await addReminder(user, { content: "one" });
        const second = await addReminder(user, { content: "two" });
        await removeReminders(user, [first.id]);
        expect(getReminders(user).map((r) => r.id)).toEqual([second.id]);
    });

    it("lists the reminders of one actor", async () => {
        await addCustomReminder(user, "mine", "Actor.a");
        await addCustomReminder(user, "other", "Actor.b");
        await addCustomReminder(user, "none");
        expect(getActorReminders(user, "Actor.a").map((r) => r.text)).toEqual(["mine"]);
    });
});

describe("addCustomReminder", () => {
    it("adds trimmed free text for an actor", async () => {
        const user = makeDoc();
        const reminder = await addCustomReminder(user, "  Sustain  ", "Actor.a");
        expect(reminder).toMatchObject({ text: "Sustain", actorUuid: "Actor.a" });
        expect(getReminders(user)).toEqual([reminder]);
    });

    it("ignores blank text", async () => {
        const user = makeDoc();
        expect(await addCustomReminder(user, "   ")).toBeUndefined();
        expect(user.setFlag).not.toHaveBeenCalled();
    });
});

describe("toggleItemReminder", () => {
    const item = { uuid: "Actor.a.Item.i", name: "Aura of Courage", actor: { uuid: "Actor.a" } };

    it("adds a reminder for the item, tagged with its actor", async () => {
        const user = makeDoc();
        expect(await toggleItemReminder(user, item)).toBe(true);
        expect(findItemReminder(user, item)).toMatchObject({ text: "Aura of Courage", itemUuid: item.uuid, actorUuid: "Actor.a" });
    });

    it("removes the reminder when toggled again", async () => {
        const user = makeDoc();
        await toggleItemReminder(user, item);
        expect(await toggleItemReminder(user, item)).toBe(false);
        expect(getReminders(user)).toEqual([]);
    });
});

describe("actor enabled setting", () => {
    it("is on unless the user turned it off", async () => {
        const user = makeDoc();
        expect(isActorEnabled(user, "Actor.a")).toBe(true);
        await setActorEnabled(user, "Actor.a", false);
        expect(isActorEnabled(user, "Actor.a")).toBe(false);
        expect(isActorEnabled(user, "Actor.b")).toBe(true);
        await setActorEnabled(user, "Actor.a", true);
        expect(isActorEnabled(user, "Actor.a")).toBe(true);
    });

    it("does not store the same actor twice", async () => {
        const user = makeDoc();
        await setActorEnabled(user, "Actor.a", false);
        await setActorEnabled(user, "Actor.a", false);
        expect(user.getFlag("pf2e-reminders", "disabledActors")).toEqual(["Actor.a"]);
    });
});

describe("getTurnReminders", () => {
    async function makeUserWithReminders() {
        const user = makeDoc();
        await addCustomReminder(user, "everywhere");
        await addCustomReminder(user, "for a", "Actor.a");
        await addCustomReminder(user, "for a at the end", "Actor.a", "turnEnd");
        await addCustomReminder(user, "for b", "Actor.b");
        return user;
    }

    const texts = (reminders) => reminders.map((reminder) => reminder.text);

    it("returns the actor's reminders for the trigger plus the ones without an actor", async () => {
        const user = await makeUserWithReminders();
        expect(texts(getTurnReminders(user, "turnStart", "Actor.a"))).toEqual(["everywhere", "for a"]);
        expect(texts(getTurnReminders(user, "turnEnd", "Actor.a"))).toEqual(["for a at the end"]);
    });

    it("treats reminders without a trigger as turn start reminders", () => {
        const user = makeDoc([{ id: "x", text: "old", actorUuid: "Actor.a" }]);
        expect(texts(getTurnReminders(user, "turnStart", "Actor.a"))).toEqual(["old"]);
        expect(getTurnReminders(user, "turnEnd", "Actor.a")).toEqual([]);
    });

    it("leaves out the actor's reminders when turned off, but keeps the ones without an actor", async () => {
        const user = await makeUserWithReminders();
        await setActorEnabled(user, "Actor.a", false);
        expect(texts(getTurnReminders(user, "turnStart", "Actor.a"))).toEqual(["everywhere"]);
        expect(getTurnReminders(user, "turnEnd", "Actor.a")).toEqual([]);
    });

    it("returns only the ones without an actor on a turn without an actor", async () => {
        const user = await makeUserWithReminders();
        expect(texts(getTurnReminders(user, "turnStart", undefined))).toEqual(["everywhere"]);
    });
});

describe("triggers on stored reminders", () => {
    it("stores the trigger on chat, custom and item reminders", async () => {
        const user = makeDoc();
        await addReminder(user, { id: "m1", content: "x" }, "Actor.a", "turnEnd");
        await addCustomReminder(user, "note", "Actor.a", "turnEnd");
        await toggleItemReminder(user, { uuid: "Actor.a.Item.i", name: "Aura", actor: { uuid: "Actor.a" } }, "turnEnd");
        expect(getReminders(user).map((reminder) => reminder.trigger)).toEqual(["turnEnd", "turnEnd", "turnEnd"]);
    });

    it("defaults to turn start", async () => {
        const user = makeDoc();
        await addCustomReminder(user, "note", "Actor.a");
        expect(getReminders(user)[0].trigger).toBe("turnStart");
    });

    it("toggles an item reminder per trigger", async () => {
        const user = makeDoc();
        const item = { uuid: "Actor.a.Item.i", name: "Aura", actor: { uuid: "Actor.a" } };
        expect(await toggleItemReminder(user, item, "turnStart")).toBe(true);
        expect(await toggleItemReminder(user, item, "turnEnd")).toBe(true);
        expect(findItemReminders(user, item)).toHaveLength(2);
        expect(await toggleItemReminder(user, item, "turnStart")).toBe(false);
        expect(findItemReminders(user, item).map((reminder) => reminder.trigger)).toEqual(["turnEnd"]);
    });
});

describe("setReminderTrigger", () => {
    it("sets the trigger of a reminder", async () => {
        const user = makeDoc();
        const { id } = await addCustomReminder(user, "note", "Actor.a");
        expect(await setReminderTrigger(user, id, "wasCritted")).toBe("wasCritted");
        expect(getReminders(user)[0].trigger).toBe("wasCritted");
    });

    it("leaves the other reminders alone and ignores unknown ids", async () => {
        const user = makeDoc([{ id: "a", text: "one" }, { id: "b", text: "two" }]);
        await setReminderTrigger(user, "b", "turnEnd");
        expect(getReminders(user)[0]).toEqual({ id: "a", text: "one" });
        expect(await setReminderTrigger(user, "nope", "turnEnd")).toBeUndefined();
    });
});

describe("clearAllData", () => {
    function makeActor(uuid, flags, owned = true) {
        const actor = makeDoc(undefined, { uuid, testUserPermission: () => owned }, flags);
        actor.unsetFlag = vi.fn();
        return actor;
    }

    function makeUser() {
        const user = makeDoc([{ id: "a", text: "x" }], {}, { disabledActors: ["Actor.a"] });
        user.unsetFlag = vi.fn();
        return user;
    }

    beforeEach(() => {
        game.actors = [];
        game.scenes = [];
    });

    it("removes the user's reminders and on/off settings", async () => {
        const user = makeUser();
        await clearAllData(user);
        expect(user.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders");
        expect(user.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "disabledActors");
    });

    it("also clears leftovers of older versions on owned actors and unlinked tokens", async () => {
        const user = makeUser();
        const world = makeActor("Actor.w", { reminders: [{ id: "r" }], enabled: true });
        const fly = makeActor("Scene.s.Token.t.Actor.f", { reminders: [{ id: "r" }] });
        const clean = makeActor("Actor.c", { reminders: undefined });
        const notMine = makeActor("Actor.n", { reminders: [{ id: "r" }] }, false);
        game.actors = [world, clean, notMine];
        game.scenes = [{ tokens: [{ actor: fly }, { actor: world }] }];

        await clearAllData(user);

        expect(world.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders");
        expect(world.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "enabled");
        expect(world.unsetFlag).toHaveBeenCalledTimes(2);
        expect(fly.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders");
        expect(clean.unsetFlag).not.toHaveBeenCalled();
        expect(notMine.unsetFlag).not.toHaveBeenCalled();
    });
});

describe("isTurnOfUser", () => {
    const player = { id: "p", isGM: false };
    const gm = { id: "g", isGM: true };

    function combatantOwnedBy(...owners) {
        return { testUserPermission: (user) => owners.includes(user) };
    }

    beforeEach(() => { game.users = [player, gm]; });

    it("is false without a combatant", () => {
        expect(isTurnOfUser(undefined, player)).toBe(false);
    });

    it("is true for the owning player", () => {
        expect(isTurnOfUser(combatantOwnedBy(player, gm), player)).toBe(true);
    });

    it("is false for a player who does not own the combatant", () => {
        expect(isTurnOfUser(combatantOwnedBy(gm), player)).toBe(false);
    });

    it("is false for the GM on a player-owned combatant", () => {
        expect(isTurnOfUser(combatantOwnedBy(player, gm), gm)).toBe(false);
    });

    it("is true for the GM on an NPC", () => {
        expect(isTurnOfUser(combatantOwnedBy(gm), gm)).toBe(true);
    });
});
