import { toViewModels } from "./ReminderItems";
import {
    addCustomReminder, getActorReminders, getReminders, isActorEnabled, removeReminders, setActorEnabled, setReminderTrigger,
} from "./RemindersStorage";
import { promptForText } from "./TitleBar";
import { pickTrigger } from "./TriggerPicker";
import { triggerOf } from "./Triggers";

/**
 * What the reminder list template needs for an actor's reminders window: all your reminders for the actor,
 * each with its trigger icon.
 */
export function windowListContext(user, actor) {
    const reminders = toViewModels(getActorReminders(user, actor.uuid));
    return {
        hasActor: true,
        showList: false,
        showToggle: true,
        showTrigger: true,
        scroll: true,
        reminders,
        note: reminders.length ? undefined : game.i18n.localize("REMINDERS.panel.empty"),
    };
}

/**
 * The changes the list's buttons make, shared by the chat message and the windows. Each one changes the stored
 * data and returns whether it did, so the caller knows to redraw. The context carries the user, the actor's uuid
 * and the trigger of the list the click happened in.
 */
const HANDLERS = {
    removeOne: async ({ user }, target) => {
        await removeReminders(user, [target.dataset.id]);
        return true;
    },
    chooseTrigger: async ({ user }, target) => {
        const reminder = getReminders(user).find((candidate) => candidate.id === target.dataset.id);
        if (!reminder) return false;
        const trigger = await pickTrigger(triggerOf(reminder));
        return Boolean(trigger && await setReminderTrigger(user, reminder.id, trigger));
    },
    toggleEnabled: async ({ user, actorUuid }) => {
        await setActorEnabled(user, actorUuid, !isActorEnabled(user, actorUuid));
        return true;
    },
    addCustom: async ({ user, actorUuid, trigger }) => {
        const input = await promptForText({ trigger });
        return Boolean(await addCustomReminder(user, input?.text, actorUuid, input?.trigger));
    },
};

export const LIST_ACTIONS = Object.keys(HANDLERS);

/**
 * Runs a list action by name. Returns true when something changed and the list should be redrawn.
 */
export async function runListAction(name, context, target) {
    return HANDLERS[name] ? HANDLERS[name](context, target) : false;
}

/**
 * ApplicationV2 actions for the list buttons: each runs the shared handler and redraws the window.
 * The window supplies its context through listActionContext().
 */
export function windowListActions() {
    return Object.fromEntries(LIST_ACTIONS.map((name) => [name, async function (_event, target) {
        if (await runListAction(name, this.listActionContext(), target)) this.render();
    }]));
}
