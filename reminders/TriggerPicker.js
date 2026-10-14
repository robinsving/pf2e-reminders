import { renderTemplate, TEMPLATES } from "./Templates";
import { getTrigger, TRIGGERS, TRIGGER_GROUP_LABELS, TRIGGER_GROUPS } from "./Triggers";

/**
 * Asks which trigger a reminder should fire on, with the current one selected. The triggers are in a tab per group,
 * opening on the tab of the current trigger. The tabs use Foundry's own tab handling (data-action="tab"); the tab that holds the selected trigger is marked.
 * Returns the trigger id, or undefined when the popup is closed.
 */
export async function pickTrigger(current) {
    const selected = getTrigger(current);
    return foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("REMINDERS.trigger.choose"), icon: "fa-solid fa-bell" },
        content: await renderTemplate(TEMPLATES.picker, {
            groups: TRIGGER_GROUPS.map((group) => ({
                id: group,
                active: group === selected.group,
                label: game.i18n.localize(TRIGGER_GROUP_LABELS[group]),
                triggers: TRIGGERS.filter((trigger) => trigger.group === group).map((trigger) => ({
                    id: trigger.id,
                    icon: trigger.icon,
                    label: game.i18n.localize(trigger.label),
                    selected: trigger.id === selected.id,
                })),
            })),
        }),
        render: (_event, dialog) => {
            dialog.element.addEventListener("change", (event) => {
                const panel = event.target.closest(".tab");
                if (event.target.type !== "radio" || !panel) return;
                for (const tab of dialog.element.querySelectorAll("nav.tabs [data-tab]")) {
                    tab.classList.toggle("pf2e-reminders-has-choice", tab.dataset.tab === panel.dataset.tab);
                }
            });
        },
        ok: {
            label: game.i18n.localize("REMINDERS.trigger.select"),
            callback: (_event, button) => button.form.elements.trigger.value,
        },
        rejectClose: false,
    });
}
