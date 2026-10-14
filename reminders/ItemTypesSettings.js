import { TEMPLATES } from "./Templates";
import { getSettings, settings } from "./utilities/Utilities";
import { id as MODULE_ID } from "../module.json";

/**
 * Types that never get a bell: the sheets show no icon list for them (ancestry, background, class, heritage, deity,
 * kits and campaign features), or the row is not something to be reminded of: a spellcasting entry such as
 * "Arcane Prepared Spells" or a lore skill.
 */
export const UNSUPPORTED_TYPES = ["ancestry", "background", "campaignFeature", "class", "deity", "heritage", "kit", "lore", "spellcastingEntry"];

/** The types without a bell: the ones the user unticked, plus the ones that can never have one. */
export function getExcludedTypes() {
    return [...getSettings(settings.excludedItemTypes), ...UNSUPPORTED_TYPES];
}

function typeLabel(type) {
    return game.i18n.localize(CONFIG.Item?.typeLabels?.[type] ?? type);
}

/**
 * Settings menu window for choosing which item types get a reminder bell on actor sheets. The ticked types are
 * listed first, each group sorted by label.
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
            .filter((type) => type !== "base" && !UNSUPPORTED_TYPES.includes(type))
            .map((type) => ({ type, label: typeLabel(type), checked: !excluded.includes(type) }))
            .sort((a, b) => Number(b.checked) - Number(a.checked) || a.label.localeCompare(b.label));
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
