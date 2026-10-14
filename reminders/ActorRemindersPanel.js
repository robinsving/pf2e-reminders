import { handleShowClick } from "./MessagePopout";
import { windowListActions, windowListContext } from "./ReminderList";
import { isActorEnabled } from "./RemindersStorage";
import { TEMPLATES } from "./Templates";
import { showToggleState } from "./TitleBar";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Window for viewing and editing your reminders for one actor and turning them on or off for the actor.
 * It uses the same list template and button handlers as the reminders chat message.
 */
export default class ActorRemindersPanel extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        classes: ["pf2e-reminders-manager"],
        window: { icon: "fa-solid fa-bell", resizable: true },
        position: { width: 420 },
        actions: windowListActions(),
    };

    static PARTS = {
        main: { template: TEMPLATES.list },
    };

    constructor(options = {}) {
        super({ ...options, id: `pf2e-reminders-actor-${options.actor?.id}` });
        this.actor = options.actor;
    }

    get title() {
        return `${this.actor.name}: ${game.i18n.localize("REMINDERS.panel.title")}`;
    }

    listActionContext() {
        return { user: game.user, actorUuid: this.actor.uuid };
    }

    async _prepareContext() {
        return windowListContext(game.user, this.actor);
    }

    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        this.element.addEventListener("click", handleShowClick);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        showToggleState(this.element, isActorEnabled(game.user, this.actor.uuid));
    }
}

export function openActorReminders(actor) {
    return new ActorRemindersPanel({ actor }).render({ force: true });
}
