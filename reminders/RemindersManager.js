import { handleShowClick } from "./MessagePopout";
import { windowListActions } from "./ReminderList";
import { toViewModels } from "./ReminderItems";
import { TEMPLATES } from "./Templates";
import { clearAllData, getReminders, removeReminders } from "./RemindersStorage";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const USER_KEY = "user";

const { removeOne, chooseTrigger } = windowListActions();

async function removeAllFor(event, target) {
    event.preventDefault(); // the button sits in a <summary>, which would otherwise toggle
    const ids = listGroups().find((group) => group.key === target.dataset.doc)?.reminders.map((reminder) => reminder.id) ?? [];
    await removeReminders(game.user, ids);
    this.render();
}

async function clearAll() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("REMINDERS.manager.clearAll") },
        content: `<p>${game.i18n.localize("REMINDERS.manager.clearConfirm")}</p>`,
        rejectClose: false,
    });
    if (!confirmed) return;
    await clearAllData(game.user);
    this.render();
}

function actorName(uuid) {
    try {
        return fromUuidSync(uuid)?.name ?? game.i18n.localize("REMINDERS.manager.unknown");
    } catch {
        return game.i18n.localize("REMINDERS.manager.unknown");
    }
}

/**
 * The user's reminders grouped by actor (or token), with the ones without an actor in a group of their own.
 */
function listGroups() {
    const groups = new Map();
    for (const reminder of getReminders(game.user)) {
        const key = reminder.actorUuid ?? USER_KEY;
        if (!groups.has(key)) {
            const title = key === USER_KEY ? game.i18n.localize("REMINDERS.manager.user") : actorName(key);
            groups.set(key, { key, title, reminders: [] });
        }
        groups.get(key).reminders.push(reminder);
    }
    return [...groups.values()];
}

/**
 * Settings menu window listing your stored reminders per actor, with the option to remove them.
 */
export default class RemindersManager extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "pf2e-reminders-manager",
        classes: ["pf2e-reminders-manager"],
        window: { title: "REMINDERS.manager.title", icon: "fa-solid fa-bell", resizable: true },
        position: { width: 440 },
        actions: { removeOne, chooseTrigger, removeAllFor, clearAll },
    };

    listActionContext() {
        return { user: game.user };
    }

    /** Keys of the sections the user has expanded, kept across redraws. */
    openKeys = new Set();

    static PARTS = {
        main: { template: TEMPLATES.manager },
    };

    async _prepareContext() {
        return {
            groups: listGroups().map(({ key, title, reminders }) => ({
                key,
                title,
                count: reminders.length,
                open: this.openKeys.has(key),
                reminders: toViewModels(reminders),
            })),
        };
    }

    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        this.element.addEventListener("click", handleShowClick);
        // The toggle event does not bubble, so it is caught while capturing
        this.element.addEventListener("toggle", (event) => {
            const { key } = event.target.dataset;
            if (!key) return;
            if (event.target.open) this.openKeys.add(key);
            else this.openKeys.delete(key);
        }, true);
    }
}
