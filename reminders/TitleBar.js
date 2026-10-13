import { renderTemplate, TEMPLATES } from "./Templates";
import { pickTrigger } from "./TriggerPicker";
import { DEFAULT_TRIGGER, triggerIcon, triggerLabel } from "./Triggers";

/**
 * Shows the on/off state of an actor's reminders: a switched-on toggle, or a dimmed switched-off toggle.
 */
export function showToggleState(root, on) {
    const toggle = root.querySelector("[data-toggle-actor]");
    if (!toggle) return;
    toggle.querySelector("i").className = `fa-solid fa-fw ${on ? "fa-toggle-on" : "fa-toggle-off"}`;
    toggle.classList.toggle("muted", !on);
    toggle.dataset.tooltip = game.i18n.localize(on ? "REMINDERS.chat.mute" : "REMINDERS.chat.unmute");
}

function showPromptTrigger(icon, trigger) {
    icon.dataset.trigger = trigger;
    icon.querySelector("i").className = triggerIcon(trigger);
    icon.dataset.tooltip = game.i18n.format("REMINDERS.trigger.toggle", { trigger: triggerLabel(trigger) });
}

/**
 * Asks for the text of a custom reminder, with a trigger icon that opens the trigger picker when clicked.
 * It starts on the given trigger. Returns { text, trigger }, or undefined when the prompt is closed.
 */
export async function promptForText({ trigger = DEFAULT_TRIGGER } = {}) {
    return foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("REMINDERS.chat.custom"), icon: "fa-solid fa-bell" },
        content: await renderTemplate(TEMPLATES.prompt, {
            trigger,
            icon: triggerIcon(trigger),
            tooltip: game.i18n.format("REMINDERS.trigger.toggle", { trigger: triggerLabel(trigger) }),
        }),
        render: (_event, dialog) => {
            const icon = dialog.element.querySelector("[data-prompt-trigger]");
            icon.addEventListener("click", async (event) => {
                event.preventDefault();
                const chosen = await pickTrigger(icon.dataset.trigger);
                if (chosen) showPromptTrigger(icon, chosen);
            });
        },
        ok: {
            label: game.i18n.localize("REMINDERS.chat.add"),
            callback: (_event, button) => ({
                text: button.form.elements.text.value,
                trigger: button.form.querySelector("[data-prompt-trigger]").dataset.trigger,
            }),
        },
        rejectClose: false,
    });
}
