import { TEMPLATES } from "./Templates";
import { getSettings, settings } from "./utilities/Utilities";
import { id as MODULE_ID } from "../module.json";

export function getExcludedTypes() {
    return getSettings(settings.excludedItemTypes);
}

function typeLabel(type) {
    return game.i18n.localize(CONFIG.Item?.typeLabels?.[type] ?? type);
}

/**
 * Settings menu window for choosing which item types get a reminder bell on actor sheets.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ItemTypesSettings extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "pf2e-reminders-item-types",
        classes: ["pf2e-reminders-manager"],
        window: { title: "REMINDERS.itemTypes.title", icon: "fa-solid fa-sliders", resizable: true },
        position: { width: 360 },
    };

    static PARTS = {
        main: { template: TEMPLATES.itemTypes },
    };

    async _prepareContext() {
        const excluded = getExcludedTypes();
        const types = game.documentTypes.Item
            .filter((type) => type !== "base")
            .map((type) => ({ type, label: typeLabel(type), checked: !excluded.includes(type) }))
            .sort((a, b) => a.label.localeCompare(b.label));
        return { types };
    }

    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        this.element.addEventListener("submit", async (event) => {
            event.preventDefault();
            const checked = new Set([...event.target.querySelectorAll("input[name=type]:checked")].map((input) => input.value));
            const excluded = [...event.target.querySelectorAll("input[name=type]")]
                .map((input) => input.value)
                .filter((type) => !checked.has(type));
            await game.settings.set(MODULE_ID, settings.excludedItemTypes.id, excluded);
            await this.close();
        });
    }
}
