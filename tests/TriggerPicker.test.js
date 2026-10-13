import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickTrigger } from "../reminders/TriggerPicker";
import { TRIGGERS } from "../reminders/Triggers";

let prompt;

beforeEach(() => {
    prompt = vi.fn(async () => "crit");
    foundry.applications.api.DialogV2 = { prompt };
});

async function openPicker(current) {
    await pickTrigger(current);
    const config = prompt.mock.calls.at(-1)[0];
    const form = document.createElement("form");
    form.innerHTML = config.content;
    return { config, form };
}

describe("pickTrigger", () => {
    it("lists every trigger with its icon and label", async () => {
        const { form } = await openPicker("turnStart");
        const choices = [...form.querySelectorAll(".pf2e-reminders-choice")];
        expect(choices.map((choice) => choice.querySelector("input").value)).toEqual(TRIGGERS.map((trigger) => trigger.id));
        expect(choices[2].querySelector("i").className).toContain("fa-crosshairs");
        expect(choices[2].textContent).toContain("REMINDERS.trigger.hit");
    });

    it("has the current trigger selected, the default one for reminders without a trigger", async () => {
        expect((await openPicker("wasHit")).form.elements.trigger.value).toBe("wasHit");
        expect((await openPicker(undefined)).form.elements.trigger.value).toBe("turnStart");
    });

    it("returns the trigger that is selected when confirmed", async () => {
        const { config, form } = await openPicker("turnStart");
        form.elements.trigger[3].checked = true;
        expect(config.ok.callback(undefined, { form })).toBe("crit");
    });

    it("returns what the popup returns, undefined when it is closed", async () => {
        prompt.mockResolvedValueOnce(undefined);
        expect(await pickTrigger("turnEnd")).toBeUndefined();
    });
});
