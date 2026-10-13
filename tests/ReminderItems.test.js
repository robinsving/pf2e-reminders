import { describe, it, expect } from "vitest";
import { toViewModels } from "../reminders/ReminderItems";
import { TEMPLATES } from "../reminders/Templates";

async function renderItems(reminders, showTrigger = false) {
    const element = document.createElement("ul");
    element.innerHTML = await foundry.applications.handlebars.renderTemplate(TEMPLATES.items, {
        reminders: toViewModels(reminders),
        showTrigger,
    });
    return element;
}

describe("toViewModels", () => {
    it("labels chat reminders with the speaker, or just chat without one", () => {
        const [withSpeaker, without] = toViewModels([
            { text: "Sustain", messageId: "m1", source: "Gavilar" },
            { text: "Sustain", messageId: "m1" },
        ]);
        expect(withSpeaker.kindLabel).toBe("REMINDERS.kind.chat: Gavilar");
        expect(without.kindLabel).toBe("REMINDERS.kind.chat");
    });

    it("labels item and custom reminders", () => {
        const [item, custom] = toViewModels([{ text: "Aura", itemUuid: "Actor.a.Item.i" }, { text: "Note" }]);
        expect(item.kindLabel).toBe("REMINDERS.kind.item");
        expect(custom.kindLabel).toBe("REMINDERS.kind.custom");
    });
});

describe("the reminder items template", () => {
    it("links chat reminders to their message and shows the label", async () => {
        const element = await renderItems([{ id: "a", text: "Sustain", messageId: "m1", source: "Gavilar" }]);
        expect(element.querySelector("[data-show-message=m1]").textContent).toBe("Sustain");
        expect(element.textContent).toContain("(REMINDERS.kind.chat: Gavilar)");
    });

    it("links item reminders to their item", async () => {
        const element = await renderItems([{ id: "a", text: "Aura", itemUuid: "Actor.a.Item.i" }]);
        expect(element.querySelector("[data-show-item]").dataset.showItem).toBe("Actor.a.Item.i");
        expect(element.textContent).toContain("(REMINDERS.kind.item)");
    });

    it("does not link custom reminders", async () => {
        const element = await renderItems([{ id: "a", text: "Note" }]);
        expect(element.querySelector("a[data-show-message], a[data-show-item]")).toBeNull();
        expect(element.textContent).toContain("(REMINDERS.kind.custom)");
    });

    it("escapes the text and the speaker", async () => {
        const element = await renderItems([{ id: "a", text: "<i>x</i>", messageId: "m1", source: "<b>" }]);
        expect(element.querySelector("li > span:first-child i")).toBeNull();
        expect(element.querySelector("b")).toBeNull();
        expect(element.textContent).toContain("<i>x</i>");
        expect(element.textContent).toContain("chat: <b>");
    });

    it("gives the remove button a data-action and the reminder id", async () => {
        const element = await renderItems([{ id: "a", text: "x" }]);
        expect(element.querySelector("[data-action=removeOne][data-id=a]")).not.toBeNull();
    });

    it("shows a trigger icon with a tooltip only when asked to", async () => {
        const reminders = [{ id: "a", text: "x", trigger: "turnEnd" }];
        expect((await renderItems(reminders)).querySelector(".pf2e-reminders-trigger")).toBeNull();

        const icon = (await renderItems(reminders, true)).querySelector("a.pf2e-reminders-trigger");
        expect(icon.querySelector("i").className).toContain("fa-hourglass-end");
        expect(icon.dataset.action).toBe("chooseTrigger");
        expect(icon.dataset.id).toBe("a");
        expect(game.i18n.format).toHaveBeenCalledWith("REMINDERS.trigger.toggle", {
            trigger: "REMINDERS.trigger.turnEnd",
        });
    });

    it("shows reminders without a trigger with the turn start icon", async () => {
        const element = await renderItems([{ id: "a", text: "x" }], true);
        expect(element.querySelector(".pf2e-reminders-trigger i").className).toContain("fa-hourglass-start");
    });
});
