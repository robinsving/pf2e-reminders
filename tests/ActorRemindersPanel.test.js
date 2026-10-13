import { describe, it, expect, vi, beforeEach } from "vitest";
import ActorRemindersPanel from "../reminders/ActorRemindersPanel";
import { makeDoc, renderWindow } from "./helpers";
import { pickTrigger } from "../reminders/TriggerPicker";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn(async () => "turnEnd") }));

let actor;
let user;

beforeEach(() => {
    actor = { id: "x", uuid: "Actor.x", name: "Sai Kai Len" };
    user = makeDoc([
        { id: "a", text: "Aura <b>", itemUuid: "Actor.x.Item.i", actorUuid: "Actor.x" },
        { id: "b", text: "Other actor", actorUuid: "Actor.y" },
    ]);
    game.user = user;
    foundry.applications.api.DialogV2 = { prompt: vi.fn(async () => ({ text: "Sustain", trigger: "turnEnd" })) };
});

function makePanel() {
    const panel = new ActorRemindersPanel({ actor });
    panel.render = vi.fn();
    return panel;
}

const { actions } = ActorRemindersPanel.DEFAULT_OPTIONS;

describe("ActorRemindersPanel", () => {
    it("can be resized", () => {
        expect(ActorRemindersPanel.DEFAULT_OPTIONS.window.resizable).toBe(true);
    });


    it("is titled with the actor name", () => {
        expect(makePanel().title).toBe("Sai Kai Len: REMINDERS.panel.title");
    });

    it("renders the same list as the chat message, with only your reminders for this actor, escaped", async () => {
        const element = await renderWindow(makePanel());
        expect(element.querySelector("h4 [data-action=toggleEnabled]")).not.toBeNull();
        expect(element.querySelector("h4 [data-action=addCustom]")).not.toBeNull();
        expect(element.querySelector("h4 [data-action=openReminders]")).toBeNull();
        expect(element.querySelector("h4").classList.contains("pf2e-reminders-title")).toBe(true);
        expect(element.querySelector("h4 .pf2e-reminders-buttons")).not.toBeNull();
        expect(element.innerHTML).toContain("Aura &lt;b&gt;");
        expect(element.innerHTML).not.toContain("Other actor");
        expect(element.querySelectorAll("[data-action=removeOne]")).toHaveLength(1);
        expect(element.querySelector("input")).toBeNull();
    });

    it("shows a switched-on toggle when on and a dimmed switched-off toggle when off", async () => {
        let element = await renderWindow(makePanel());
        expect(element.querySelector("[data-toggle-actor] i").className).toContain("fa-toggle-on");

        user = makeDoc([], {}, { disabledActors: ["Actor.x"] });
        game.user = user;
        element = await renderWindow(makePanel());
        expect(element.querySelector("[data-toggle-actor] i").className).toContain("fa-toggle-off");
        expect(element.querySelector("[data-toggle-actor]").classList.contains("muted")).toBe(true);
        expect(element.textContent).toContain("REMINDERS.panel.empty");
    });

    it("scrolls inside the window when the list is long, set inline", async () => {
        const body = (await renderWindow(makePanel())).querySelector(".pf2e-reminders-body");
        expect(body.style.maxHeight).toBe("60vh");
        expect(body.style.overflowY).toBe("auto");
    });

    it("shows each reminder's trigger as an icon", async () => {
        const element = await renderWindow(makePanel());
        expect(element.querySelectorAll("[data-action=chooseTrigger]")).toHaveLength(1);
    });

    it("turns the actor off for the user and re-renders", async () => {
        const panel = makePanel();
        await actions.toggleEnabled.call(panel, {}, {});
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "disabledActors", ["Actor.x"]);
        expect(panel.render).toHaveBeenCalled();
    });

    it("adds the prompted text on the chosen trigger and re-renders", async () => {
        const panel = makePanel();
        await actions.addCustom.call(panel, {}, {});
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", expect.arrayContaining([
            expect.objectContaining({ text: "Sustain", actorUuid: "Actor.x", trigger: "turnEnd" }),
        ]));
        expect(panel.render).toHaveBeenCalled();
    });

    it("does nothing for a closed prompt", async () => {
        foundry.applications.api.DialogV2.prompt.mockResolvedValue(undefined);
        const panel = makePanel();
        await actions.addCustom.call(panel, {}, {});
        expect(panel.render).not.toHaveBeenCalled();
    });

    it("sets the trigger chosen in the popup and re-renders", async () => {
        const panel = makePanel();
        await actions.chooseTrigger.call(panel, {}, { dataset: { id: "a" } });
        expect(user.getFlag("pf2e-reminders", "reminders").find((reminder) => reminder.id === "a").trigger).toBe("turnEnd");
        expect(panel.render).toHaveBeenCalled();
    });

    it("removes a reminder from the user and re-renders", async () => {
        const panel = makePanel();
        await actions.removeOne.call(panel, {}, { dataset: { id: "a" } });
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", [expect.objectContaining({ id: "b" })]);
        expect(panel.render).toHaveBeenCalled();
    });
});
