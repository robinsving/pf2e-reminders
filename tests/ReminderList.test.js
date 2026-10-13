import { describe, it, expect, vi, beforeEach } from "vitest";
import { LIST_ACTIONS, runListAction, windowListActions, windowListContext } from "../reminders/ReminderList";
import { makeDoc } from "./helpers";
import { pickTrigger } from "../reminders/TriggerPicker";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn() }));

let user;
const actor = { uuid: "Actor.a" };

beforeEach(() => {
    vi.clearAllMocks();
    user = makeDoc([
        { id: "a", text: "Aura", actorUuid: "Actor.a" },
        { id: "b", text: "Other", actorUuid: "Actor.b" },
    ]);
    game.user = user;
    foundry.applications.api.DialogV2 = { prompt: vi.fn(async () => ({ text: "Note", trigger: "turnEnd" })) };
});

describe("windowListContext", () => {
    it("lists only the actor's reminders with trigger icons and the actor controls", () => {
        const context = windowListContext(user, actor);
        expect(context.reminders.map((reminder) => reminder.id)).toEqual(["a"]);
        expect(context).toMatchObject({ hasActor: true, showList: false, showTrigger: true, note: undefined });
    });

    it("has a note instead of a list when the actor has no reminders", () => {
        expect(windowListContext(user, { uuid: "Actor.none" }).note).toBe("REMINDERS.panel.empty");
    });
});

describe("runListAction", () => {
    const context = () => ({ user, actorUuid: "Actor.a" });

    it("offers every list button", () => {
        expect(LIST_ACTIONS).toEqual(["removeOne", "chooseTrigger", "toggleEnabled", "addCustom"]);
    });

    it("removes a reminder", async () => {
        expect(await runListAction("removeOne", context(), { dataset: { id: "a" } })).toBe(true);
        expect(user.getFlag("pf2e-reminders", "reminders").map((reminder) => reminder.id)).toEqual(["b"]);
    });

    it("sets the trigger picked in the popup, starting it on the reminder's current one", async () => {
        pickTrigger.mockResolvedValueOnce("crit");
        expect(await runListAction("chooseTrigger", context(), { dataset: { id: "a" } })).toBe(true);
        expect(pickTrigger).toHaveBeenCalledWith("turnStart");
        expect(user.getFlag("pf2e-reminders", "reminders")[0].trigger).toBe("crit");
    });

    it("changes nothing when the popup is closed or the reminder is unknown", async () => {
        pickTrigger.mockResolvedValueOnce(undefined);
        expect(await runListAction("chooseTrigger", context(), { dataset: { id: "a" } })).toBe(false);
        expect(await runListAction("chooseTrigger", context(), { dataset: { id: "nope" } })).toBe(false);
        expect(pickTrigger).toHaveBeenCalledTimes(1);
    });

    it("turns the actor off and on", async () => {
        await runListAction("toggleEnabled", context(), {});
        expect(user.getFlag("pf2e-reminders", "disabledActors")).toEqual(["Actor.a"]);
        await runListAction("toggleEnabled", context(), {});
        expect(user.getFlag("pf2e-reminders", "disabledActors")).toEqual([]);
    });

    it("adds a custom reminder with the prompted text and trigger, starting the prompt on the list's trigger", async () => {
        expect(await runListAction("addCustom", { ...context(), trigger: "turnEnd" }, {})).toBe(true);
        expect(user.getFlag("pf2e-reminders", "reminders").at(-1)).toMatchObject({ text: "Note", trigger: "turnEnd", actorUuid: "Actor.a" });
        expect(foundry.applications.api.DialogV2.prompt.mock.calls[0][0].content).toContain('data-trigger="turnEnd"');
    });

    it("reports nothing changed when the prompt is closed or blank", async () => {
        foundry.applications.api.DialogV2.prompt.mockResolvedValue(undefined);
        expect(await runListAction("addCustom", context(), {})).toBe(false);
        foundry.applications.api.DialogV2.prompt.mockResolvedValue({ text: "  ", trigger: "turnStart" });
        expect(await runListAction("addCustom", context(), {})).toBe(false);
    });

    it("ignores unknown actions", async () => {
        expect(await runListAction("openReminders", context(), {})).toBe(false);
    });
});

describe("windowListActions", () => {
    it("makes one ApplicationV2 action per list button that runs it and redraws the window", async () => {
        const actions = windowListActions();
        expect(Object.keys(actions)).toEqual(LIST_ACTIONS);
        const window = { render: vi.fn(), listActionContext: () => ({ user, actorUuid: "Actor.a" }) };
        await actions.removeOne.call(window, {}, { dataset: { id: "a" } });
        expect(window.render).toHaveBeenCalledTimes(1);
        await actions.chooseTrigger.call(window, {}, { dataset: { id: "nope" } });
        expect(window.render).toHaveBeenCalledTimes(1);
    });
});
