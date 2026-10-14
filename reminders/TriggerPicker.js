import { renderTemplate, TEMPLATES } from "./Templates";
import { getTrigger, TRIGGERS, TRIGGER_CATEGORY_LABELS, TRIGGER_GROUP_LABELS, TRIGGER_GROUPS } from "./Triggers";

/**
 * Splits the triggers of a tab into sections by category, in the order the categories first appear. A category is
 * who the roll concerns, so a section has a heading; the triggers without one (the turn ones) have no heading.
 */
function sectionsOf(triggers, selected) {
    const sections = [];
    for (const trigger of triggers) {
        let section = sections.find((candidate) => candidate.category === trigger.category);
        if (!section) {
            section = {
                category: trigger.category,
                label: trigger.category ? game.i18n.localize(TRIGGER_CATEGORY_LABELS[trigger.category]) : undefined,
                triggers: [],
            };
            sections.push(section);
        }
        section.triggers.push({
            id: trigger.id,
            icon: trigger.icon,
            label: game.i18n.localize(trigger.label),
            selected: trigger.id === selected.id,
        });
    }
    return sections;
}

/**
 * Asks which trigger a reminder should fire on, with the current one selected. The triggers are in a tab per group,
 * opening on the tab of the current trigger, and a heading within a tab for who the roll concerns. The tabs use Foundry's own tab handling (data-action="tab"); the tab that holds the selected trigger is marked.
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
                sections: sectionsOf(TRIGGERS.filter((trigger) => trigger.group === group), selected),
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
