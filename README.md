# PF2e Robin's Reminders

Right-click a chat message, choose **Add reminder**, and get reminded at the start or the end of your turn in the combat tracker. Handy for sustained spells and durations that must be kept in mind.

## Usage
1. Right-click any chat message (a spell card, an effect, a condition, ...) and pick **Add reminder: &lt;actor name&gt;**. A popup asks which trigger it should fire on (see Triggers). The actors listed are your selected tokens, otherwise your combatants, otherwise your tokens on the scene, otherwise your assigned character (the GM only gets non-player actors). The entry is only offered when there is such an actor; without one, there is no entry.
2. At the start of that actor's turn, or at the end of it for turn end reminders, a private chat message (whispered only to you) lists your reminders for that trigger and actor. When the turn passes from one combatant to the next, the end of the old turn comes before the start of the new one. The message title says which trigger it is. Each has a trash icon to remove it. Nothing is posted if there is nothing to show.
3. The right side of the title line has a **+** to type a custom reminder for the turn's actor on the message's own trigger and a bell that opens the actor's reminders window with all of its reminders (the same bell as on the sheets). The on/off toggle for the actor is only in that window.

All reminders are stored per user, so they are private to you and never shared with other owners of an actor or with the GM's view. They stay until you remove them, also between encounters. Only the newest reminders message is active; older ones are marked as past turns.

### From a character sheet
Every item row on an actor sheet (feats, actions, spells, effects, ...) gets a bell icon when you own the actor. Click it to add a reminder for that item, for example an aura or a sustained effect; a popup asks which trigger it fires on (see Triggers). Click the bell again to remove the item's reminders. In the module settings, **Item reminder bells** > **Choose item types** lets you tick which kinds of items get a bell (by default all except spellcasting entries such as "Arcane Prepared Spells"). The choice is per browser; reopen open sheets to see a change. The bell goes in the row's icon list on the right, also on NPC abilities and strikes. NPC sheets get no bells and no **Reminders** button (also not in the combat tracker menu) by default; the GM can turn them on with the world setting **Reminders for NPCs**. NPCs are also left out of the chat right-click menu's actor list. The reminder belongs to that actor's turns, and its text opens the item sheet.

### Per-actor reminders window
Open an actor's reminders window from the **Reminders** button in the actor sheet header, or by right-clicking a combatant in the combat tracker and choosing **Reminders**. It lists your reminders for that actor, lets you add a custom one or remove any, and has the same title line as the turn message, with a toggle to turn the actor's reminders on or off and a **+** for a custom reminder. Reminders are on for every actor by default (nothing shows until you add one). Turn it off to keep your reminders for that actor stored but silent. The on/off setting is also per user. Reminders stored without an actor, left over from earlier versions, still show on all your turns until you remove them in **Manage reminders**.

### Managing reminders
In the module settings, **Manage reminders** lists all your stored reminders, grouped per actor or token in collapsed sections you can expand (a chevron points right when collapsed and down when expanded), and lets you remove single reminders, or all reminders of one actor, token or the leftover group without an actor with that heading's **Remove all**.

**Clear all reminders** at the bottom of that window does a full reset after a confirmation. It removes all your reminders and on/off settings, and also clears leftover reminders that older versions stored on actors you own.

Click a reminder's text to pop the original chat message (or item sheet) out with Foundry's built-in windows. If it was deleted you get a warning instead.

## Triggers
A reminder fires on a trigger: **turn start** (the default), **turn end**, or one of four attack triggers: **you hit**, **you critically hit**, **you are hit** and **you are critically hit**. Reminders from earlier versions have no trigger and count as turn start. In the actor's reminders window and in **Manage reminders**, each reminder has an icon for its trigger (an hourglass at its start or end, a crosshair, a bullseye, a shield, a broken heart). Hover it to see which trigger it is, and click it to open a popup where you choose another. The title of the message also shows the trigger as an icon. The custom reminder prompt (the **+**) has the same icon next to the text field, starting on the trigger of the list you opened it from; click it to choose from the popup before saving. The on/off setting for an actor covers all triggers.

The attack triggers fire when a PF2e attack roll (strike or spell attack) against a target hits. Hit also fires on a critical hit, so a reminder for either counts every hit; critical hit fires on critical hits only. They fire right after the attack roll, as a private message like the turn ones, for the attacker (**you hit**, **you critically hit**) or for the target (**you are hit**, **you are critically hit**). Only actors you own count, and the roll needs a target: an attack without one has no outcome. A reroll that changes the outcome does not fire anything. Each attack message makes the older message of the same trigger a past one.

## Turning it off
The client setting **Enable reminders** (on by default) turns every feature off for you: the chat menu entries, the sheet bells and **Reminders** button, the combat tracker entry and the turn messages. Your stored reminders are kept, and **Manage reminders** still works.

## Debugging
Turn on **Debug logging** in the module settings to print debug messages to the browser console: a summary at startup (version, settings, number of stored reminders, registered hooks), template loading, every change to your stored reminders, and each reminders message that is posted. The module always logs when it registers its hooks and when it has initialized and is ready.

## Compatibility
Foundry v14 and the Pathfinder 2e system.

## License
MIT
