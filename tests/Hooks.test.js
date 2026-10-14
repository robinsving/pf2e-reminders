import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn(async () => "turnStart") }));
vi.mock("../reminders/RemindersMessage", () => ({
    renderRemindersMessage: vi.fn(),
    createRemindersMessage: vi.fn(),
}));

import { addCombatantOption, addSheetHeaderButton, onCombatTurnChange, logInitialized, logInitializing, onCreateChatMessage, registerContextOption, registerSettings } from "../reminders/hooks/Hooks";
import { setSettings } from "./helpers";
import { MAX_CANDIDATES } from "../reminders/Candidates";
import { createRemindersMessage } from "../reminders/RemindersMessage";
import { pickTrigger } from "../reminders/TriggerPicker";

const user = {
    isGM: false,
    getFlag: vi.fn(() => [{ id: "a", text: "Sustain" }]),
    setFlag: vi.fn(),
};
const ownedCombatant = { name: "Sai Kai Len", actor: { uuid: "Actor.a" }, testUserPermission: () => true };
const otherCombatant = { name: "Goblin", actor: { uuid: "Actor.g" }, testUserPermission: () => true };

function makeCombat(combatants) {
    return { combatants: { get: vi.fn((id) => combatants[id]) } };
}

const previousState = { combatantId: "prev" };
const currentState = { combatantId: "cur" };

function remindersFlag(reminders) {
    user.getFlag.mockImplementation((_module, key) => (key === "reminders" ? reminders : undefined));
}

beforeEach(() => {
    vi.clearAllMocks();
    setSettings();
    game.user = user;
    game.users = [user];
    remindersFlag([
        { id: "s", text: "Sustain", actorUuid: "Actor.a" },
        { id: "e", text: "Drop the shield", actorUuid: "Actor.a", trigger: "turnEnd" },
    ]);
});

describe("onCombatTurnChange", () => {
    it("posts a turn start message for the new combatant", async () => {
        await onCombatTurnChange(makeCombat({ cur: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
        expect(createRemindersMessage).toHaveBeenCalledWith(ownedCombatant, "turnStart");
    });

    it("posts a turn end message for the previous combatant", async () => {
        await onCombatTurnChange(makeCombat({ prev: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
        expect(createRemindersMessage).toHaveBeenCalledWith(ownedCombatant, "turnEnd");
    });

    it("posts the end of one turn before the start of the next", async () => {
        await onCombatTurnChange(makeCombat({ prev: ownedCombatant, cur: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage.mock.calls.map(([, trigger]) => trigger)).toEqual(["turnEnd", "turnStart"]);
    });

    it("posts nothing for combatants whose reminders are for another trigger or actor", async () => {
        await onCombatTurnChange(makeCombat({ cur: otherCombatant, prev: otherCombatant }), previousState, currentState);
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("posts nothing for combatants the user does not own", async () => {
        const notMine = { ...ownedCombatant, testUserPermission: () => false };
        await onCombatTurnChange(makeCombat({ cur: notMine, prev: notMine }), previousState, currentState);
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("copes with a missing previous combatant, as at the start of combat", async () => {
        await onCombatTurnChange(makeCombat({ cur: ownedCombatant }), undefined, currentState);
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the user has turned the module off", async () => {
        setSettings({ enabled: false });
        await onCombatTurnChange(makeCombat({ cur: ownedCombatant, prev: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("does nothing without reminders", async () => {
        remindersFlag(undefined);
        await onCombatTurnChange(makeCombat({ cur: ownedCombatant, prev: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("still tries the other trigger when one fails", async () => {
        createRemindersMessage.mockRejectedValueOnce(new Error("boom"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        await onCombatTurnChange(makeCombat({ prev: ownedCombatant, cur: ownedCombatant }), previousState, currentState);
        expect(createRemindersMessage).toHaveBeenCalledTimes(2);
        console.error.mockRestore();
    });
});

describe("registerContextOption", () => {
    const li = document.createElement("li");
    li.dataset.messageId = "m1";

    beforeEach(() => {
        delete user.character;
        game.messages = { get: vi.fn(() => ({ id: "m1", content: "<h3>Sustain</h3>", alias: "Gavilar" })) };
        globalThis.ui = { notifications: { info: vi.fn() } };
    });

    it("registers a fixed number of slots that only show for existing targets", () => {
        const actor = { id: "a", uuid: "Actor.a", name: "Sai Kai Len", testUserPermission: () => true };
        user.character = actor;
        const options = [];
        registerContextOption({}, options);

        expect(options).toHaveLength(MAX_CANDIDATES);
        expect(options[0].visible()).toBe(true);
        expect(game.i18n.format).toHaveBeenLastCalledWith("REMINDERS.AddReminder", { actor: "Sai Kai Len" });
        expect(options[1].visible()).toBe(false);
        delete user.character;
    });

    it("stores the clicked message on the chosen actor", async () => {
        const actor = { id: "a", uuid: "Actor.a", name: "Sai Kai Len", testUserPermission: () => true };
        user.character = actor;
        const options = [];
        registerContextOption({}, options);
        options[0].visible();

        await options[0].onClick(undefined, li);

        expect(game.messages.get).toHaveBeenCalledWith("m1");
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", expect.arrayContaining([expect.objectContaining({ actorUuid: "Actor.a", trigger: "turnStart" })]));
        expect(ui.notifications.info).toHaveBeenCalled();
        delete user.character;
    });

    it("stores the reminder on the trigger picked in the popup, which starts on turn start", async () => {
        user.character = { id: "a", uuid: "Actor.a", name: "Sai Kai Len", testUserPermission: () => true };
        const options = [];
        registerContextOption({}, options);
        options[0].visible();
        pickTrigger.mockResolvedValueOnce("wasHit");

        await options[0].onClick(undefined, li);

        expect(pickTrigger).toHaveBeenCalledWith("turnStart");
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", expect.arrayContaining([expect.objectContaining({ trigger: "wasHit" })]));
        delete user.character;
    });

    it("adds nothing when the popup is closed", async () => {
        user.character = { id: "a", uuid: "Actor.a", name: "Sai Kai Len", testUserPermission: () => true };
        const options = [];
        registerContextOption({}, options);
        options[0].visible();
        pickTrigger.mockResolvedValueOnce(undefined);

        await options[0].onClick(undefined, li);

        expect(user.setFlag).not.toHaveBeenCalled();
        expect(ui.notifications.info).not.toHaveBeenCalled();
        delete user.character;
    });

    it("shows no menu entries when the user has turned the module off", () => {
        user.character = { id: "a", uuid: "Actor.a", name: "Sai Kai Len", testUserPermission: () => true };
        setSettings({ enabled: false });
        const options = [];
        registerContextOption({}, options);
        expect(options.some((option) => option.visible())).toBe(false);
        delete user.character;
    });

    it("shows no menu entry when there are no actors", () => {
        const options = [];
        registerContextOption({}, options);
        expect(options.some((option) => option.visible())).toBe(false);
    });
});

describe("registerSettings", () => {
    it("registers the settings and the two settings menus", () => {
        game.settings.register = vi.fn();
        game.settings.registerMenu = vi.fn();
        registerSettings();
        expect(game.settings.register).toHaveBeenCalledWith("pf2e-reminders", "enabled", expect.objectContaining({ scope: "client", default: true }));
        expect(game.settings.register).toHaveBeenCalledWith("pf2e-reminders", "debugMode", expect.objectContaining({ default: false }));
        expect(game.settings.register).toHaveBeenCalledWith("pf2e-reminders", "excludedItemTypes", expect.objectContaining({ config: false, default: expect.not.arrayContaining(["action", "affliction", "effect", "feat", "spell"]) }));
        expect(game.settings.register).toHaveBeenCalledWith("pf2e-reminders", "excludedItemTypes", expect.objectContaining({ default: expect.arrayContaining(["weapon", "condition"]) }));
        expect(game.settings.register).toHaveBeenCalledWith("pf2e-reminders", "npcReminders", expect.objectContaining({ scope: "world", default: false }));
        expect(game.settings.registerMenu).toHaveBeenCalledWith("pf2e-reminders", "storedRemindersMenu", expect.objectContaining({ restricted: false }));
        expect(game.settings.registerMenu).toHaveBeenCalledWith("pf2e-reminders", "itemTypesMenu", expect.objectContaining({ restricted: false }));
    });
});

describe("addSheetHeaderButton", () => {
    it("adds a reminders button for owned actors", () => {
        const buttons = [{ class: "close" }];
        addSheetHeaderButton({ actor: { isOwner: true } }, buttons);
        expect(buttons[0].class).toBe("pf2e-reminders-header");
    });

    it("adds nothing on NPC sheets unless the GM turned NPC controls on", () => {
        const buttons = [];
        addSheetHeaderButton({ actor: { isOwner: true, type: "npc" } }, buttons);
        expect(buttons).toHaveLength(0);

        setSettings({ npcReminders: true });
        addSheetHeaderButton({ actor: { isOwner: true, type: "npc" } }, buttons);
        expect(buttons).toHaveLength(1);
        setSettings();
    });

    it("adds nothing when the user has turned the module off", () => {
        setSettings({ enabled: false });
        const buttons = [];
        addSheetHeaderButton({ actor: { isOwner: true } }, buttons);
        expect(buttons).toHaveLength(0);
    });

    it("adds nothing for actors the user does not own", () => {
        const buttons = [];
        addSheetHeaderButton({ actor: { isOwner: false } }, buttons);
        expect(buttons).toHaveLength(0);
    });
});

describe("addCombatantOption", () => {
    function makeLi() {
        const li = document.createElement("li");
        li.dataset.combatantId = "c1";
        return li;
    }

    it("is visible for combatants whose actor the user owns", () => {
        game.combat = { combatants: { get: vi.fn(() => ({ actor: { isOwner: true } })) } };
        const options = [];
        addCombatantOption({}, options);
        expect(options[0].visible(makeLi())).toBe(true);
        game.combat = { combatants: { get: vi.fn(() => ({ actor: { isOwner: false } })) } };
        expect(options[0].visible(makeLi())).toBe(false);
    });

    it("is hidden for NPC combatants unless the GM turned NPC controls on", () => {
        game.combat = { combatants: { get: vi.fn(() => ({ actor: { isOwner: true, type: "npc" } })) } };
        const options = [];
        addCombatantOption({}, options);
        expect(options[0].visible(makeLi())).toBe(false);

        setSettings({ npcReminders: true });
        expect(options[0].visible(makeLi())).toBe(true);
        setSettings();
    });
});

describe("onCreateChatMessage", () => {
    const owned = { name: "Sai Kai Len", uuid: "Actor.a", testUserPermission: () => true };
    const foreign = { name: "Goblin", uuid: "Actor.g", testUserPermission: () => false };
    const attack = (outcome, origin = "Actor.a", target = "Actor.g") => ({
        flags: { pf2e: { context: { type: "attack-roll", outcome, origin: { actor: origin, token: "Token.o" }, target: { actor: target } } } },
    });

    beforeEach(() => {
        remindersFlag([
            { id: "h", text: "Mark", actorUuid: "Actor.a", trigger: "hit" },
            { id: "c", text: "Smite", actorUuid: "Actor.a", trigger: "crit" },
            { id: "w", text: "Shield", actorUuid: "Actor.a", trigger: "wasHit" },
        ]);
        globalThis.fromUuidSync = vi.fn((uuid) => ({ "Actor.a": owned, "Actor.g": foreign, "Token.o": { id: "t" } })[uuid]);
    });

    it("posts hit reminders for the attacker's actor", async () => {
        await onCreateChatMessage(attack("success"));
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
        expect(createRemindersMessage).toHaveBeenCalledWith({ actor: owned, token: { id: "t" } }, "hit");
    });

    it("also posts the critical hit reminders on a critical hit", async () => {
        await onCreateChatMessage(attack("criticalSuccess"));
        expect(createRemindersMessage.mock.calls.map(([, trigger]) => trigger)).toEqual(["crit", "hit"]);
    });

    it("posts was hit reminders for the target's actor", async () => {
        await onCreateChatMessage(attack("success", "Actor.g", "Actor.a"));
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
        expect(createRemindersMessage).toHaveBeenCalledWith({ actor: owned, token: undefined }, "wasHit");
    });

    it("posts save reminders for the actor that rolled the save", async () => {
        remindersFlag([{ id: "s", text: "Resist", actorUuid: "Actor.a", trigger: "saveFailure" }]);
        await onCreateChatMessage({ flags: { pf2e: { context: { type: "saving-throw", outcome: "failure", origin: { actor: "Actor.g" }, target: { actor: "Actor.a" } } } } });
        expect(createRemindersMessage).toHaveBeenCalledTimes(1);
        expect(createRemindersMessage).toHaveBeenCalledWith({ actor: owned, token: undefined }, "saveFailure");
    });

    it("posts nothing for a miss, actors the user does not own or other message types", async () => {
        await onCreateChatMessage(attack("failure"));
        await onCreateChatMessage(attack("success", "Actor.g", "Actor.g"));
        await onCreateChatMessage({ flags: {} });
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("does nothing when the user has turned the module off", async () => {
        setSettings({ enabled: false });
        await onCreateChatMessage(attack("success"));
        expect(createRemindersMessage).not.toHaveBeenCalled();
    });

    it("keeps going when one trigger fails", async () => {
        createRemindersMessage.mockRejectedValueOnce(new Error("boom"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        await onCreateChatMessage(attack("criticalSuccess"));
        expect(createRemindersMessage).toHaveBeenCalledTimes(2);
        console.error.mockRestore();
    });
});

describe("startup logging", () => {
    beforeEach(() => {
        game.user = user;
        game.modules = new Map([["pf2e-reminders", { version: "1.2.3" }]]);
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
        console.info.mockRestore();
        console.debug.mockRestore();
    });

    it("logs when the module initializes and when it is ready, with the module title", () => {
        logInitializing();
        logInitialized();
        expect(console.info).toHaveBeenNthCalledWith(1, expect.stringContaining("Initializing"));
        expect(console.info).toHaveBeenNthCalledWith(2, expect.stringContaining("Initialized"));
        expect(console.info.mock.calls[0][0]).toContain("PF2e Robin's Reminders");
    });

    it("logs a summary of the module state when debug logging is on, and nothing when it is off", () => {
        logInitialized();
        expect(console.debug).not.toHaveBeenCalled();
        setSettings({ debugMode: true, npcReminders: true });
        logInitialized();
        const summary = console.debug.mock.calls[0][0];
        expect(summary).toContain("Version 1.2.3");
        expect(summary).toContain("reminders for NPCs: true");
        expect(summary).toContain("combatTurnChange");
    });
});
