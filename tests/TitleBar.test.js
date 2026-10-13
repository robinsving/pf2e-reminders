import { describe, it, expect, vi, beforeEach } from "vitest";
import { promptForText, showToggleState } from "../reminders/TitleBar";
import { pickTrigger } from "../reminders/TriggerPicker";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn() }));

let prompt;

beforeEach(() => {
    prompt = vi.fn(async () => undefined);
    foundry.applications.api.DialogV2 = { prompt };
});

function openPrompt(options) {
    return promptForText(options).then(() => {
        const config = prompt.mock.calls.at(-1)[0];
        const dialog = { element: document.createElement("div") };
        dialog.element.innerHTML = `<form>${config.content}</form>`;
        config.render(undefined, dialog);
        return { config, dialog, form: dialog.element.querySelector("form") };
    });
}

describe("promptForText", () => {
    it("asks for the text, with a trigger icon that starts on turn start", async () => {
        const { form } = await openPrompt();
        const icon = form.querySelector("[data-prompt-trigger]");
        expect(form.elements.text).toBeDefined();
        expect(icon.dataset.trigger).toBe("turnStart");
        expect(icon.querySelector("i").className).toContain("fa-hourglass-start");
        expect(game.i18n.format).toHaveBeenCalledWith("REMINDERS.trigger.toggle", {
            trigger: "REMINDERS.trigger.turnStart",
        });
    });

    it("starts on the given trigger", async () => {
        const { form } = await openPrompt({ trigger: "turnEnd" });
        const icon = form.querySelector("[data-prompt-trigger]");
        expect(icon.dataset.trigger).toBe("turnEnd");
        expect(icon.querySelector("i").className).toContain("fa-hourglass-end");
    });

    it("opens the trigger picker when the icon is clicked and shows the chosen trigger", async () => {
        const { form } = await openPrompt();
        const icon = form.querySelector("[data-prompt-trigger]");
        pickTrigger.mockResolvedValueOnce("hit");
        icon.click();
        await vi.waitFor(() => expect(icon.dataset.trigger).toBe("hit"));
        expect(pickTrigger).toHaveBeenCalledWith("turnStart");
        expect(icon.querySelector("i").className).toContain("fa-crosshairs");
        expect(game.i18n.format).toHaveBeenLastCalledWith("REMINDERS.trigger.toggle", { trigger: "REMINDERS.trigger.hit" });
    });

    it("keeps the trigger when the picker is closed", async () => {
        const { form } = await openPrompt();
        const icon = form.querySelector("[data-prompt-trigger]");
        pickTrigger.mockResolvedValueOnce(undefined);
        icon.click();
        await vi.waitFor(() => expect(pickTrigger).toHaveBeenCalled());
        expect(icon.dataset.trigger).toBe("turnStart");
    });

    it("returns the text with the trigger that is showing", async () => {
        const { config, form } = await openPrompt();
        form.elements.text.value = "Note";
        pickTrigger.mockResolvedValueOnce("turnEnd");
        form.querySelector("[data-prompt-trigger]").click();
        await vi.waitFor(() => expect(form.querySelector("[data-prompt-trigger]").dataset.trigger).toBe("turnEnd"));
        expect(config.ok.callback(undefined, { form })).toEqual({ text: "Note", trigger: "turnEnd" });
    });

    it("returns undefined when the prompt is closed", async () => {
        expect(await promptForText()).toBeUndefined();
    });
});

describe("showToggleState", () => {
    it("does nothing without a toggle", () => {
        expect(() => showToggleState(document.createElement("div"), true)).not.toThrow();
    });
});
