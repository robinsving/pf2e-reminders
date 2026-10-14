import { id as MODULE_ID } from "../module.json";
import { openActorReminders } from "./ActorRemindersPanel";
import { isModuleEnabled, showsReminderControls } from "./Availability";
import { handleShowClick } from "./MessagePopout";
import { toViewModels } from "./ReminderItems";
import { runListAction } from "./ReminderList";
import { renderTemplate, TEMPLATES } from "./Templates";
import { DEFAULT_TRIGGER, supersedeGroup, triggerIcon, triggerLabel } from "./Triggers";
import { getTurnReminders } from "./RemindersStorage";

const MESSAGE_FLAG = "turnMessage";

/**
 * Posts a private chat message for the combatant's turn, or for any `{ actor, token }` the reminders concern. The reminders are filled in when it renders,
 * so removed reminders disappear from it.
 */
export async function createRemindersMessage(combatant, trigger) {
    return ChatMessage.create({
        author: game.user.id,
        speaker: ChatMessage.getSpeaker({ token: combatant.token }),
        content: `<div class="pf2e-reminders-chat"><h4>${game.i18n.localize("REMINDERS.chat.title")}</h4></div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        whisper: [game.user.id],
        flags: { [MODULE_ID]: { [MESSAGE_FLAG]: { actorUuid: combatant.actor?.uuid, trigger } } },
    });
}

function isLatestRemindersMessage(message) {
    const group = supersedeGroup(message.getFlag(MODULE_ID, MESSAGE_FLAG).trigger);
    const latest = game.messages.contents.findLast((other) => {
        const flag = other.getFlag(MODULE_ID, MESSAGE_FLAG);
        return flag && supersedeGroup(flag.trigger) === group;
    });
    return latest?.id === message.id;
}

/**
 * What the reminder list template needs for a reminders message: the user's reminders for its trigger and actor.
 * Only the newest message is active; older ones just say they are from earlier.
 */
function messageListContext(message, { actorUuid, trigger }) {
    const superseded = !isLatestRemindersMessage(message);
    const reminders = superseded ? [] : toViewModels(getTurnReminders(game.user, trigger, actorUuid));
    const actor = actorUuid ? fromUuidSync(actorUuid) : undefined;
    let note;
    if (superseded) note = game.i18n.localize("REMINDERS.chat.past");
    else if (!reminders.length) note = game.i18n.localize("REMINDERS.chat.empty");
    return {
        superseded,
        hasActor: Boolean(actorUuid) && !superseded,
        showList: !superseded && Boolean(actor?.isOwner) && showsReminderControls(actor),
        showTrigger: false,
        triggerLabel: triggerLabel(trigger),
        triggerIcon: triggerIcon(trigger),
        reminders,
        note,
    };
}

/**
 * Fills the reminder list into the message. It uses the same template and button handlers as the actor's
 * reminders window; after each change the list is drawn again.
 */
export async function renderRemindersMessage(message, html) {
    if (!isModuleEnabled() || !message.getFlag(MODULE_ID, MESSAGE_FLAG)) return;
    const section = html.querySelector(".pf2e-reminders-chat");
    if (!section) return;

    const { actorUuid, trigger = DEFAULT_TRIGGER } = message.getFlag(MODULE_ID, MESSAGE_FLAG);
    const draw = async () => {
        const context = messageListContext(message, { actorUuid, trigger });
        section.innerHTML = await renderTemplate(TEMPLATES.list, context);
        return context;
    };
    if ((await draw()).superseded) return;

    section.addEventListener("click", async (event) => {
        if (handleShowClick(event)) return;
        const target = event.target.closest("[data-action]");
        if (!target) return;
        if (target.dataset.action === "openReminders") {
            openActorReminders(fromUuidSync(actorUuid));
            return;
        }
        if (await runListAction(target.dataset.action, { user: game.user, actorUuid, trigger }, target)) await draw();
    });
}
