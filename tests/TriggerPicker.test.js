import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickTrigger } from "../reminders/TriggerPicker";
import { TRIGGER_GROUPS, TRIGGERS } from "../reminders/Triggers";

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
    config.render(undefined, { element: form });
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

    it("has a tab per group, with the triggers of the group in its panel, in order", async () => {
        const { form } = await openPicker("turnStart");
        const tabs = [...form.querySelectorAll("nav.tabs [data-tab]")];
        expect(tabs.map((tab) => tab.textContent)).toEqual(["REMINDERS.trigger.group.turn", "REMINDERS.trigger.group.attack", "REMINDERS.trigger.group.save"]);
        const groups = TRIGGER_GROUPS.map((group) => TRIGGERS.filter((trigger) => trigger.group === group).map((trigger) => trigger.id));
        expect(groups.map((ids) => ids.length)).toEqual([2, 8, 4]);
        const panels = [...form.querySelectorAll(".tab")];
        expect(panels.map((panel) => [...panel.querySelectorAll("input")].map((input) => input.value))).toEqual(groups);
    });

    it("uses Foundry's own tab handling: tab actions with a group, and panels with the same group and tab", async () => {
        const { form } = await openPicker("turnStart");
        for (const tab of form.querySelectorAll("nav.tabs [data-tab]")) {
            expect(tab.dataset.action).toBe("tab");
            expect(tab.dataset.group).toBe("triggers");
            expect(tab.tagName).toBe("BUTTON");
            const panel = form.querySelector(`.tab[data-tab=${tab.dataset.tab}]`);
            expect(panel.dataset.group).toBe("triggers");
        }
    });

    it("opens on the tab of the current trigger, with the tab and its panel active", async () => {
        for (const [current, group] of [["turnEnd", "turn"], ["crit", "attack"], ["saveFailure", "save"], [undefined, "turn"]]) {
            const { form } = await openPicker(current);
            expect(form.querySelector("nav.tabs .active").dataset.tab).toBe(group);
            expect([...form.querySelectorAll(".tab.active")].map((panel) => panel.dataset.tab)).toEqual([group]);
        }
    });

    it("marks the tab that holds the selected trigger, also after another trigger is picked", async () => {
        const { form } = await openPicker("turnStart");
        const marked = () => [...form.querySelectorAll("nav.tabs .pf2e-reminders-has-choice")].map((tab) => tab.dataset.tab);
        expect(marked()).toEqual(["turn"]);
        const input = form.querySelector("input[value=wasHit]");
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        expect(marked()).toEqual(["attack"]);
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
