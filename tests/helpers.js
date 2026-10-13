import { vi } from "vitest";

/**
 * A document stand-in that keeps its flags in memory.
 */
export function makeDoc(reminders = [], extra = {}, flags = {}) {
    flags = { reminders, ...flags };
    return {
        getFlag: vi.fn((_module, key) => flags[key]),
        setFlag: vi.fn(async (_module, key, value) => { flags[key] = value; }),
        ...extra,
    };
}

const DEFAULT_SETTINGS = { enabled: true, npcReminders: false, excludedItemTypes: ["spellcastingEntry"] };

/**
 * Makes game.settings.get return the module's default values, with the given overrides.
 */
export function setSettings(overrides = {}) {
    const values = { ...DEFAULT_SETTINGS, ...overrides };
    game.settings.get = vi.fn((_module, key) => values[key] ?? false);
}

/**
 * Renders a Handlebars window the way Foundry would, without a frame: the prepared context goes through
 * the window's template, the result becomes the app's element and the render hook runs.
 */
export async function renderWindow(app) {
    const context = await app._prepareContext({});
    const html = await foundry.applications.handlebars.renderTemplate(app.constructor.PARTS.main.template, context);
    const element = document.createElement("div");
    element.innerHTML = html;
    // Foundry only accepts a part that renders a single HTML element
    if (element.children.length !== 1) {
        throw new Error(`Template part "main" must render a single HTML element, got ${element.children.length}`);
    }
    app.element = element;
    app._onRender(context, {});
    return element;
}
