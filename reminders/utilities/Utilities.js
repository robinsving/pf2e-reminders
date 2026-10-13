import { id as MODULE_ID, title as MODULE_TITLE } from "../../module.json";
export { debug, error, info, popup, settings, getSettings, registerSettings, registerSettingsMenu };

const settings = {
    debug: { id: "debugMode", name: "REMINDERS.debug.name", hint: "REMINDERS.debug.hint" },

    enabled: {
        id: "enabled",
        name: "REMINDERS.enabled.name",
        hint: "REMINDERS.enabled.hint",
        scope: "client",
        default: true,
    },

    excludedItemTypes: {
        id: "excludedItemTypes",
        name: "REMINDERS.itemTypes.excluded",
        scope: "client",
        config: false,
        type: Array,
        default: ["spellcastingEntry"],
    },

    npcReminders: {
        id: "npcReminders",
        name: "REMINDERS.npcReminders.name",
        hint: "REMINDERS.npcReminders.hint",
        scope: "world",
    },

    itemTypesMenu: {
        id: "itemTypesMenu",
        name: "REMINDERS.itemTypes.name",
        label: "REMINDERS.itemTypes.label",
        hint: "REMINDERS.itemTypes.hint",
        icon: "fa-solid fa-sliders",
    },

    storedRemindersMenu: {
        id: "storedRemindersMenu",
        name: "REMINDERS.manager.name",
        label: "REMINDERS.manager.label",
        hint: "REMINDERS.manager.hint",
        icon: "fa-solid fa-bell",
    },
};

function getSettings(setting) {
    return game.settings.get(MODULE_ID, setting.id);
}

function registerSettings(setting) {
    game.settings.register(MODULE_ID, setting.id, {
        name: setting.name,
        hint: setting.hint,
        scope: setting.scope || "client",
        config: setting.config ?? true,
        type: setting.type || Boolean,
        default: setting.default ?? false,
        requiresReload: setting.requiresReload || false,
    });
}

function registerSettingsMenu(setting, type = setting.type) {
    game.settings.registerMenu(MODULE_ID, setting.id, {
        name: setting.name,
        label: setting.label || setting.name,
        hint: setting.hint,
        icon: setting.icon || "fa-solid fa-cog",
        type,
        restricted: setting.restricted || false,
    });
}

function popup(message, type = "info") {
    const notifications = globalThis.ui?.notifications;
    if (!notifications) {
        info(message);
        return;
    }

    const prefixedMessage = `${MODULE_TITLE}: ${message}`;
    if (type === "warn") {
        notifications.warn(prefixedMessage);
        return;
    }

    if (type === "error") {
        notifications.error(prefixedMessage, { permanent: true });
        return;
    }

    notifications.info(prefixedMessage);
}

function debug(message) {
    if (getSettings(settings.debug))
        console.debug(`${MODULE_TITLE}: ${message}`);
}

function info(message) {
    console.info(`${MODULE_TITLE}: ${message}`);
}

/**
 * Log an error message
 * @param {string} msg - Error message to log
 * @param {*} error - Optional error object
 */
function error(msg, error) {
    console.error(`${MODULE_TITLE}: ERROR | ${msg}`, error);
}
