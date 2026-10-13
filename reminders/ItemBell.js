import { getExcludedTypes } from "./ItemTypesSettings";
import { showsReminderControls } from "./Availability";
import { debug, error } from "./utilities/Utilities";
import { findItemReminders, toggleItemReminder } from "./RemindersStorage";

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
            const added = await toggleItemReminder(game.user, item);
            debug(`${added ? "Added" : "Removed"} reminder for item ${item.uuid}`);
            bell.classList.toggle("active", findItemReminders(game.user, item).length > 0);
        } catch (e) {
            error(`Error toggling reminder for item ${item.uuid}`, e);
        }
    });
    return bell;
}

/**
 * Adds a bell to every item row of an actor sheet; clicking it toggles a reminder for that item.
 * The bell goes in the row's icon list on the right: the item controls, or the controls of the abilities and
 * strikes on the NPC sheet. NPC sheets only get bells when the GM has turned that on in the settings.
 */
export function addItemBells(app, html) {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || !app.actor?.items || !app.actor.isOwner) return;
    if (!showsReminderControls(app.actor)) return;
    const excludedTypes = getExcludedTypes();
    const getItem = (row) => {
        const item = app.actor.items.get(row.dataset.itemId);
        return item && !excludedTypes.includes(item.type) ? item : undefined;
    };

    for (const controls of root.querySelectorAll("li[data-item-id] .item-controls")) {
        const item = getItem(controls.closest("li[data-item-id]"));
        if (!item || controls.querySelector(".pf2e-reminders-item-bell")) continue;
        controls.prepend(createBell(item));
    }

    for (const row of root.querySelectorAll("li[data-item-id]")) {
        if (row.querySelector(".item-controls")) continue;
        const controls = row.querySelector(":scope > .controls");
        const item = getItem(row);
        if (controls && item && !controls.querySelector(".pf2e-reminders-item-bell")) controls.prepend(createBell(item));
    }
}
