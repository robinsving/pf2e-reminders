import { getExcludedTypes } from "./ItemTypesSettings";
import { showsReminderControls } from "./Availability";
import { debug, error } from "./utilities/Utilities";
import { findItemReminders, removeReminders, toggleItemReminder } from "./RemindersStorage";
import { pickTrigger } from "./TriggerPicker";
import { DEFAULT_TRIGGER } from "./Triggers";

/**
 * A click on the bell removes the item's reminders, or asks for a trigger and adds one when it has none. A
 * shift-click always asks for a trigger and adds a reminder on it, or removes the one the item already has on it, so
 * an item can have a reminder on several triggers.
 */
function createBell(item) {
    const bell = document.createElement("a");
    bell.className = "pf2e-reminders-item-bell";
    bell.innerHTML = '<i class="fa-solid fa-fw fa-bell"></i>';
    bell.classList.toggle("active", findItemReminders(game.user, item).length > 0);
    bell.dataset.tooltip = game.i18n.localize("REMINDERS.itemBell");
    bell.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
            const existing = findItemReminders(game.user, item);
            if (existing.length && !event.shiftKey) {
                await removeReminders(game.user, existing.map((reminder) => reminder.id));
                debug(`Removed reminder for item ${item.uuid}`);
            } else {
                const trigger = await pickTrigger(DEFAULT_TRIGGER);
                if (!trigger) return;
                const added = await toggleItemReminder(game.user, item, trigger);
                debug(`${added ? "Added" : "Removed"} ${trigger} reminder for item ${item.uuid}`);
            }
            bell.classList.toggle("active", findItemReminders(game.user, item).length > 0);
        } catch (e) {
            error(`Error toggling reminder for item ${item.uuid}`, e);
        }
    });
    return bell;
}

/**
 * Spell rows lay their icons out in a grid column of a fixed width, which the extra bell overflows into the
 * cast button. Letting that column fit its icons makes room for the bell. It is set inline, as the sheet's own
 * stylesheet sets the width on the row.
 */
function makeRoomForBell(row) {
    if (row?.parentElement?.matches("ol.spell-list")) row.style.setProperty("--controls-width", "min-content");
}

/**
 * Adds a bell to every item row of an actor sheet; clicking it removes the item's reminders, or asks for a trigger and adds one.
 * The bell goes in the row's icon list on the right: the item controls, or the controls of the abilities and
 * strikes on the NPC sheet. NPC sheets only get bells when the GM has turned that on in the settings.
 */
export function addItemBells(app, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || !app.actor?.items || !app.actor.isOwner) return;
    if (!showsReminderControls(app.actor)) return;
    const excludedTypes = getExcludedTypes();
    const getItem = (row) => {
        // the rank lines of a spell list carry the id of their spellcasting entry; they are not item rows
        if (row.classList.contains("header-row")) return undefined;
        const item = app.actor.items.get(row.dataset.itemId);
        return item && !excludedTypes.includes(item.type) ? item : undefined;
    };

    for (const controls of root.querySelectorAll("li[data-item-id] .item-controls")) {
        const item = getItem(controls.closest("li[data-item-id]"));
        if (!item || controls.querySelector(".pf2e-reminders-item-bell")) continue;
        controls.prepend(createBell(item));
        makeRoomForBell(controls.closest("li[data-item-id]"));
    }

    for (const row of root.querySelectorAll("li[data-item-id]")) {
        if (row.querySelector(".item-controls")) continue;
        const controls = row.querySelector(":scope > .controls");
        const item = getItem(row);
        if (controls && item && !controls.querySelector(".pf2e-reminders-item-bell")) {
            controls.prepend(createBell(item));
            makeRoomForBell(row);
        }
    }
}
