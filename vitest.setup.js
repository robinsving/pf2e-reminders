import fs from 'node:fs'
import path from 'node:path'
import Handlebars from 'handlebars'
import { vi } from 'vitest'

globalThis.game = {
    settings: {
        get: vi.fn((_module, key) => ({ enabled: true, excludedItemTypes: ["spellcastingEntry"] })[key] ?? false),
    },
    i18n: {
        localize: vi.fn((key) => key),
        format: vi.fn((key) => key),
    },
};

globalThis.Hooks = {
    on: vi.fn(),
    once: vi.fn(),
};

// Renders the real templates with Handlebars, the way Foundry does: partials are registered under their module path
const templatesDir = path.resolve(__dirname, 'templates')
const templatePath = (file) => `modules/pf2e-reminders/templates/${file}`

Handlebars.registerHelper('localize', (key) => game.i18n.localize(key))

function walk(dir, prefix = '') {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
            ? walk(path.join(dir, entry.name), `${prefix}${entry.name}/`)
            : [`${prefix}${entry.name}`])
}

for (const file of walk(templatesDir)) {
    Handlebars.registerPartial(templatePath(file), fs.readFileSync(path.join(templatesDir, file), 'utf-8'))
}

globalThis.foundry = {
    applications: {
        api: {
            ApplicationV2: class {
                static DEFAULT_OPTIONS = {};
                _onFirstRender() {}
                _onRender() {}
            },
            HandlebarsApplicationMixin: (Base) => class extends Base {},
        },
        handlebars: {
            renderTemplate: vi.fn(async (template, data) => {
                const file = template.replace('modules/pf2e-reminders/templates/', '')
                return Handlebars.compile(fs.readFileSync(path.join(templatesDir, file), 'utf-8'))(data)
            }),
            loadTemplates: vi.fn(async () => {}),
        },
    },
    utils: {
        randomID: vi.fn(() => `id_${Math.random().toString(36).substring(2, 9)}`),
    },
};
