import { triggerIconPlain, triggerLabel, triggerOf } from "./Triggers";

function kindLabel(reminder) {
    if (reminder.messageId) {
        const chat = game.i18n.localize("REMINDERS.kind.chat");
        return reminder.source ? `${chat}: ${reminder.source}` : chat;
    }
    return game.i18n.localize(reminder.itemUuid ? "REMINDERS.kind.item" : "REMINDERS.kind.custom");
}

/**
 * Adds what the templates need to show a reminder: the label saying where it comes from, and its trigger icon
 * with a tooltip. The icon has no outcome colour in the lists.
 */
export function toViewModels(reminders) {
    return reminders.map((reminder) => ({
        ...reminder,
        kindLabel: kindLabel(reminder),
        triggerLabel: triggerLabel(triggerOf(reminder)),
        triggerIcon: triggerIconPlain(triggerOf(reminder)),
        triggerTooltip: game.i18n.format("REMINDERS.trigger.toggle", {
            trigger: triggerLabel(triggerOf(reminder)),
        }),
    }));
}
