import { popup } from "./utilities/Utilities";

/**
 * Pops the original chat message out with Foundry's own chat popout window.
 * Returns false when the message has been deleted.
 */
export async function showMessage(messageId) {
    const message = game.messages.get(messageId);
    if (!message) {
        popup(game.i18n.localize("REMINDERS.messageGone"), "warn");
        return false;
    }

    await new CONFIG.ChatMessage.popoutClass({ message }).render({ force: true });
    return true;
}

/**
 * Opens the sheet of the item a reminder was made from. Returns false when the item is gone.
 */
export async function showItem(uuid) {
    const item = await fromUuid(uuid);
    if (!item) {
        popup(game.i18n.localize("REMINDERS.itemGone"), "warn");
        return false;
    }
    await item.sheet.render(true);
    return true;
}

/**
 * Click handler for reminder links (data-show-message, data-show-item). Returns true when it handled the click.
 */
export function handleShowClick(event) {
    const messageLink = event.target.closest?.("[data-show-message]");
    const itemLink = event.target.closest?.("[data-show-item]");
    if (!messageLink && !itemLink) return false;
    event.preventDefault();
    if (messageLink) showMessage(messageLink.dataset.showMessage);
    else showItem(itemLink.dataset.showItem);
    return true;
}
