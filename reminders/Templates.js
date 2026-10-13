import { id as MODULE_ID } from "../module.json";
import { debug } from "./utilities/Utilities";

const path = (file) => `modules/${MODULE_ID}/templates/${file}`;

export const TEMPLATES = {
    titleBar: path("partials/title-bar.hbs"),
    items: path("partials/reminder-items.hbs"),
    list: path("reminder-list.hbs"),
    manager: path("reminders-manager.hbs"),
    itemTypes: path("item-types.hbs"),
    prompt: path("custom-reminder-prompt.hbs"),
    picker: path("trigger-picker.hbs"),
};

export function renderTemplate(template, data = {}) {
    return foundry.applications.handlebars.renderTemplate(template, data);
}

/**
 * Loads all templates, which also registers the partials the other templates include.
 */
export function loadTemplates() {
    debug(`Loading ${Object.keys(TEMPLATES).length} templates`);
    return foundry.applications.handlebars.loadTemplates(Object.values(TEMPLATES));
}
