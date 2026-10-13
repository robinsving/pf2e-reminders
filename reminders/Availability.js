import { getSettings, settings } from "./utilities/Utilities";

/**
 * Whether the user has the module's features turned on at all.
 */
export function isModuleEnabled() {
    return Boolean(getSettings(settings.enabled));
}

/**
 * Whether the sheet-based reminder controls (item bells, the Reminders button) are shown for an actor.
 * Nothing is shown when the module is turned off. NPCs only get them when the GM has turned that on in the settings.
 */
export function showsReminderControls(actor) {
    return isModuleEnabled() && (actor?.type !== "npc" || Boolean(getSettings(settings.npcReminders)));
}
