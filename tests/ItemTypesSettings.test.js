import { describe, it, expect, vi, beforeEach } from "vitest";
import ItemTypesSettings from "../reminders/ItemTypesSettings";
import { renderWindow } from "./helpers";

beforeEach(() => {
    game.documentTypes = { Item: ["base", "weapon", "spell", "spellcastingEntry"] };
    game.settings.set = vi.fn();
    globalThis.CONFIG = { Item: { typeLabels: { weapon: "Weapon", spell: "Spell", spellcastingEntry: "Spellcasting Entry" } } };
});

async function makeApp() {
    const app = new ItemTypesSettings();
    const element = await renderWindow(app);
    app.close = vi.fn();
    app._onFirstRender({}, {});
    return { app, element };
}

describe("ItemTypesSettings", () => {
    it("can be resized", () => {
        expect(ItemTypesSettings.DEFAULT_OPTIONS.window.resizable).toBe(true);
    });


    it("lists the item types sorted by label, ticked unless excluded, without the base type", async () => {
        const { element } = await makeApp();
        const boxes = [...element.querySelectorAll("input[name=type]")];
        expect(boxes.map((box) => box.value)).toEqual(["spell", "spellcastingEntry", "weapon"]);
        expect(boxes.map((box) => box.checked)).toEqual([true, false, true]);
        expect(element.textContent).toContain("Spellcasting Entry");
    });

    it("uses Foundry's form markup: a form group per type, labelled, and a footer with the save button", async () => {
        const { element } = await makeApp();
        const form = element.querySelector("form.standard-form");
        expect(form).not.toBeNull();
        const groups = [...form.querySelectorAll(".form-group")];
        expect(groups).toHaveLength(3);
        expect(groups[0].querySelector("label").textContent).toBe("Spell");
        expect(groups[0].querySelector("label").htmlFor).toBe(groups[0].querySelector("input").id);
        expect(groups[0].querySelector(".form-fields input[type=checkbox]")).not.toBeNull();
        expect(form.querySelector("footer.form-footer button[type=submit]")).not.toBeNull();
        expect(form.querySelector(".hint").textContent).toBe("REMINDERS.itemTypes.intro");
    });

    it("scrolls inside the window when the list is long, set inline so no stylesheet can override it", async () => {
        const { element } = await makeApp();
        expect(element.querySelector("form").style.maxHeight).toBe("60vh");
        expect(element.querySelector("form").style.overflowY).toBe("auto");
    });

    it("saves the unticked types as excluded and closes", async () => {
        const { app, element } = await makeApp();
        element.querySelector("input[value=weapon]").checked = false;
        element.querySelector("input[value=spellcastingEntry]").checked = true;
        element.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        await vi.waitFor(() => expect(app.close).toHaveBeenCalled());
        expect(game.settings.set).toHaveBeenCalledWith("pf2e-reminders", "excludedItemTypes", ["weapon"]);
    });
});
