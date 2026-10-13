import { renderTemplate, TEMPLATES } from "./Templates";
import { getTrigger, TRIGGERS } from "./Triggers";

/**
 * Asks which trigger a reminder should fire on, with the current one selected.
 * Returns the trigger id, or undefined when the popup is closed.
 */
export async function pickTrigger(current) {
    const selected = getTrigger(current).id;
    return foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("REMINDERS.trigger.choose"), icon: "fa-solid fa-bell" },
        content: await renderTemplate(TEMPLATES.picker, {
            triggers: TRIGGERS.map((trigger) => ({
                id: trigger.id,
                icon: trigger.icon,
                label: game.i18n.localize(trigger.label),
                selected: trigger.id === selected,
            })),
        }),
        ok: {
            label: game.i18n.localize("REMINDERS.trigger.select"),
            callback: (_event, button) => button.form.elements.trigger.value,
        },
        rejectClose: false,
    });
}
