import { getReminderTargets, MAX_CANDIDATES } from "../Candidates";
import { id as MODULE_ID } from "../../module.json";
import { addReminder, getReminders, getTurnReminders, isTurnOfUser } from "../RemindersStorage";
import ItemTypesSettings from "../ItemTypesSettings";
import { isModuleEnabled, showsReminderControls } from "../Availability";
import { openActorReminders } from "../ActorRemindersPanel";
import { addItemBells } from "../ItemBell";
import RemindersManager from "../RemindersManager";
import { debug, error, getSettings, info, popup, registerSettings as registerSetting, registerSettingsMenu, settings } from "../utilities/Utilities";
import { createRemindersMessage, renderRemindersMessage } from "../RemindersMessage";
import { loadTemplates } from "../Templates";
import { pickTrigger } from "../TriggerPicker";
import { attackTriggersOf, DEFAULT_TRIGGER, TRIGGERS_IN_FIRING_ORDER } from "../Triggers";

function slotLabel(target) {
    return game.i18n.format("REMINDERS.AddReminder", { actor: target.name });
}

/**
 * Foundry builds the chat context menu once, so a fixed number of entries is registered and each one
 * shows itself, with the right actor name, only when the menu opens.
 */
function createSlot(slot) {
    const entry = {
        icon: '<i class="fa-solid fa-bell"></i>',
        label: "",
        visible: () => {
            const target = isModuleEnabled() ? getReminderTargets()[slot] : undefined;
            entry.target = target;
            if (target) entry.label = slotLabel(target);
            return Boolean(target);
        },
        onClick: async (_event, li) => {
            try {
                const message = game.messages.get(li.dataset.messageId);
                if (!message || !entry.target) return;
                const trigger = await pickTrigger(DEFAULT_TRIGGER);
                if (!trigger) return;
                const reminder = await addReminder(game.user, message, entry.target.actorUuid, trigger);
                debug(`Added reminder ${reminder.id} from message ${message.id}`);
                popup(game.i18n.format("REMINDERS.added", { text: reminder.text }));
            } catch (e) {
                error("Error adding reminder from chat message", e);
            }
        },
    };
    return entry;
}

export function registerContextOption(_chatLog, options) {
    for (let slot = 0; slot < MAX_CANDIDATES; slot++) options.push(createSlot(slot));
}

/**
 * Fires the reminders of every trigger at a turn change: the end of the previous turn first, then the start of the
 * new one. Each client only posts for combatants it owns.
 */
export async function onCombatTurnChange(combat, previous, current) {
    if (!isModuleEnabled()) return;
    for (const trigger of TRIGGERS_IN_FIRING_ORDER) {
        try {
            const combatant = trigger.combatantOf(combat, previous, current);
            if (!combatant || !isTurnOfUser(combatant, game.user)) continue;
            const reminders = getTurnReminders(game.user, trigger.id, combatant.actor?.uuid);
            if (!reminders.length) continue;
            debug(`Posting ${reminders.length} ${trigger.id} reminder(s) for ${combatant.name}`);
            await createRemindersMessage(combatant, trigger.id);
        } catch (e) {
            error(`Error posting ${trigger.id} reminders`, e);
        }
    }
}

/**
 * Fires the hit and critical hit reminders of an attack roll message, both for the attacker and for the target.
 * Each client only posts for actors it owns.
 */
export async function onCreateChatMessage(message) {
    if (!isModuleEnabled()) return;
    for (const { trigger, actorUuid, tokenUuid } of attackTriggersOf(message.flags?.pf2e?.context)) {
        try {
            const actor = fromUuidSync(actorUuid);
            if (!actor || !isTurnOfUser(actor, game.user)) continue;
            const reminders = getTurnReminders(game.user, trigger.id, actorUuid);
            if (!reminders.length) continue;
            debug(`Posting ${reminders.length} ${trigger.id} reminder(s) for ${actor.name}`);
            await createRemindersMessage({ actor, token: tokenUuid ? fromUuidSync(tokenUuid) : undefined }, trigger.id);
        } catch (e) {
            error(`Error posting ${trigger.id} reminders`, e);
        }
    }
}

export function registerSettings() {
    registerSetting(settings.enabled);
    registerSetting(settings.debug);
    registerSetting(settings.excludedItemTypes);
    registerSetting(settings.npcReminders);
    registerSettingsMenu(settings.itemTypesMenu, ItemTypesSettings);
    registerSettingsMenu(settings.storedRemindersMenu, RemindersManager);
}

export function addSheetHeaderButton(app, buttons) {
    if (!app.actor?.isOwner || !showsReminderControls(app.actor)) return;
    buttons.unshift({
        label: game.i18n.localize("REMINDERS.panel.button"),
        class: "pf2e-reminders-header",
        icon: "fa-solid fa-bell",
        onclick: () => openActorReminders(app.actor),
    });
}

export function addCombatantOption(_tracker, options) {
    const getActor = (li) => game.combat?.combatants.get(li.dataset.combatantId)?.actor;
    const entry = {
        icon: "fa-solid fa-bell",
        label: "REMINDERS.panel.combatant",
        visible: (li) => {
            const actor = getActor(li);
            return Boolean(actor?.isOwner) && showsReminderControls(actor);
        },
        onClick: (_event, li) => openActorReminders(getActor(li)),
    };
    options.push(entry);
}

export const logInitializing = () => info("Initializing");
export function logInitialized() {
    info("Initialized");
    const reminders = getReminders(game.user);
    debug(`Version ${game.modules.get(MODULE_ID)?.version}; enabled: ${isModuleEnabled()}; reminders for NPCs: ${Boolean(getSettings(settings.npcReminders))}; `
        + `${reminders.length} stored reminder(s) for ${game.user.name}; hooks: ${REGISTERED_HOOKS.map(([name]) => name).join(", ")}`);
}

const SETUP_HOOKS = [
    ["init", logInitializing],
    ["init", registerSettings],
    ["init", loadTemplates],
    ["ready", logInitialized],
];

const REGISTERED_HOOKS = [
    ["getActorSheetHeaderButtons", addSheetHeaderButton],
    ["getCombatantContextOptions", addCombatantOption],
    ["renderActorSheet", (app, html) => {
        try {
            addItemBells(app, html);
        } catch (e) {
            error("Error adding reminder bells to the actor sheet", e);
        }
    }],
    ["getChatMessageContextOptions", registerContextOption],
    ["combatTurnChange", onCombatTurnChange],
    ["createChatMessage", onCreateChatMessage],
    ["renderChatMessageHTML", async (message, html) => {
        try {
            await renderRemindersMessage(message, html);
        } catch (e) {
            error("Error rendering reminders message", e);
        }
    }],
];

info(`Registering hooks: ${SETUP_HOOKS.map(([name]) => name).join(", ")} (once), ${REGISTERED_HOOKS.map(([name]) => name).join(", ")}`);
for (const [name, handler] of SETUP_HOOKS) Hooks.once(name, handler);
for (const [name, handler] of REGISTERED_HOOKS) Hooks.on(name, handler);
