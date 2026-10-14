import { id as MODULE_ID } from "../module.json";
import { DEFAULT_TRIGGER, triggerOf } from "./Triggers";
import { debug } from "./utilities/Utilities";

const FLAG = "reminders";
const DISABLED_FLAG = "disabledActors";
const LEGACY_ACTOR_FLAGS = ["reminders", "enabled"];
const MAX_TEXT_LENGTH = 200;

/**
 * Builds a short plain-text summary of a chat message, preferring the card title (h3) when present.
 */
export function summarizeMessage(message) {
    const container = document.createElement("div");
    container.innerHTML = message?.content ?? "";
    const title = container.querySelector("h3")?.textContent;
    const text = (title || container.textContent || message?.flavor || "").replace(/\s+/g, " ").trim();
    return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
}

/**
 * All reminders are stored on the user, so they are private to each user. Reminders for an actor carry its uuid;
 * reminders without one apply to every turn of the user.
 */
export function getReminders(user) {
    return user.getFlag(MODULE_ID, FLAG) ?? [];
}

export function getActorReminders(user, actorUuid) {
    return getReminders(user).filter((reminder) => reminder.actorUuid === actorUuid);
}

async function saveReminders(user, reminders) {
    debug(`Saving ${reminders.length} reminder(s) for ${user.name}`);
    await user.setFlag(MODULE_ID, FLAG, reminders);
}

async function addToUser(user, reminder) {
    await saveReminders(user, [...getReminders(user), reminder]);
    return reminder;
}

/**
 * Adds a reminder for a chat message, for an actor, firing on the given trigger.
 */
export async function addReminder(user, message, actorUuid, trigger = DEFAULT_TRIGGER) {
    return addToUser(user, {
        trigger,
        id: foundry.utils.randomID(),
        text: summarizeMessage(message),
        messageId: message?.id,
        source: message?.alias ?? message?.speaker?.alias ?? "",
        actorUuid,
    });
}

/**
 * Adds a free-text reminder. Returns undefined for blank text.
 */
export async function addCustomReminder(user, text, actorUuid, trigger = DEFAULT_TRIGGER) {
    const trimmed = text?.trim();
    if (!trimmed) return undefined;
    debug(`Adding custom reminder for ${actorUuid} on trigger ${trigger}`);
    return addToUser(user, { id: foundry.utils.randomID(), text: trimmed.slice(0, MAX_TEXT_LENGTH), actorUuid, trigger });
}

/**
 * The reminders made for an item, on any trigger.
 */
export function findItemReminders(user, item) {
    return getReminders(user).filter((reminder) => reminder.itemUuid === item.uuid);
}

export function findItemReminder(user, item, trigger = DEFAULT_TRIGGER) {
    return findItemReminders(user, item).find((reminder) => triggerOf(reminder) === trigger);
}

/**
 * Adds a reminder for an item (for its actor) on the given trigger, or removes the one it already has
 * for that trigger. Returns true when added.
 */
export async function toggleItemReminder(user, item, trigger = DEFAULT_TRIGGER) {
    const existing = findItemReminder(user, item, trigger);
    if (existing) {
        await removeReminders(user, [existing.id]);
        return false;
    }
    await addToUser(user, { id: foundry.utils.randomID(), text: item.name, itemUuid: item.uuid, actorUuid: item.actor?.uuid, trigger });
    return true;
}

/**
 * Sets the trigger of a reminder. Returns the trigger, or undefined for an unknown reminder.
 */
export async function setReminderTrigger(user, id, trigger) {
    debug(`Setting reminder ${id} to trigger ${trigger}`);
    const reminders = getReminders(user);
    const reminder = reminders.find((candidate) => candidate.id === id);
    if (!reminder) return undefined;
    await saveReminders(user, reminders.map((candidate) => (candidate === reminder ? { ...candidate, trigger } : candidate)));
    return trigger;
}

export async function removeReminders(user, ids) {
    debug(`Removing reminder(s) ${ids.join(", ")}`);
    await saveReminders(user, getReminders(user).filter((reminder) => !ids.includes(reminder.id)));
}

/**
 * Reminders are shown for an actor unless the user has turned them off for it.
 */
export function isActorEnabled(user, actorUuid) {
    return !(user.getFlag(MODULE_ID, DISABLED_FLAG) ?? []).includes(actorUuid);
}

export async function setActorEnabled(user, actorUuid, enabled) {
    debug(`Turning reminders ${enabled ? "on" : "off"} for ${actorUuid}`);
    const disabled = (user.getFlag(MODULE_ID, DISABLED_FLAG) ?? []).filter((uuid) => uuid !== actorUuid);
    await user.setFlag(MODULE_ID, DISABLED_FLAG, enabled ? disabled : [...disabled, actorUuid]);
}

/**
 * The reminders to fire on a trigger: the ones without an actor, plus the actor's own unless turned off for it.
 */
export function getTurnReminders(user, trigger, actorUuid) {
    const showActor = actorUuid && isActorEnabled(user, actorUuid);
    return getReminders(user).filter((reminder) =>
        triggerOf(reminder) === trigger && (!reminder.actorUuid || (showActor && reminder.actorUuid === actorUuid)));
}

/**
 * Actors the user owns, including the temporary actors of unlinked tokens, which are not in the Actors tab.
 */
function listOwnedActors(user) {
    const tokenActors = Array.from(game.scenes).flatMap((scene) => Array.from(scene.tokens, (token) => token.actor));
    const actors = [...game.actors, ...tokenActors].filter((actor) => actor?.testUserPermission(user, "OWNER"));
    return [...new Map(actors.map((actor) => [actor.uuid, actor])).values()];
}

/**
 * Removes everything the module stores for the user: their reminders and on/off settings, and the leftovers
 * that older versions kept on actors they own.
 */
export async function clearAllData(user) {
    debug(`Clearing all reminder data for ${user.name}`);
    await user.unsetFlag(MODULE_ID, FLAG);
    await user.unsetFlag(MODULE_ID, DISABLED_FLAG);
    for (const actor of listOwnedActors(user)) {
        for (const legacyFlag of LEGACY_ACTOR_FLAGS) {
            if (actor.getFlag(MODULE_ID, legacyFlag) !== undefined) await actor.unsetFlag(MODULE_ID, legacyFlag);
        }
    }
}

/**
 * True when the combatant's turn belongs to the user: owners only, and the GM only for combatants no player owns.
 */
export function isTurnOfUser(combatant, user) {
    if (!combatant || !combatant.testUserPermission(user, "OWNER")) return false;
    if (!user.isGM) return true;
    return !game.users.some((other) => !other.isGM && combatant.testUserPermission(other, "OWNER"));
}
