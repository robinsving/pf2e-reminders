/**
 * The moments a reminder can fire on. Turn triggers say which combatant they concern, given what Foundry reports
 * for a turn change: the previous and the current combat state. Attack triggers fire on a PF2e attack roll message
 * and say which side of the roll they concern (the attacker or the target) and which outcomes count.
 */
export const TRIGGERS = [
    {
        id: "turnStart",
        kind: "turn",
        label: "REMINDERS.trigger.turnStart",
        icon: "fa-solid fa-hourglass-start",
        fireOrder: 1,
        combatantOf: (combat, _previous, current) => combat.combatants.get(current?.combatantId),
    },
    {
        id: "turnEnd",
        kind: "turn",
        label: "REMINDERS.trigger.turnEnd",
        icon: "fa-solid fa-hourglass-end",
        fireOrder: 0, // the end of a turn comes before the start of the next
        combatantOf: (combat, previous) => combat.combatants.get(previous?.combatantId),
    },
    {
        id: "hit",
        kind: "attack",
        label: "REMINDERS.trigger.hit",
        icon: "fa-solid fa-crosshairs",
        side: "origin",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "crit",
        kind: "attack",
        label: "REMINDERS.trigger.crit",
        icon: "fa-solid fa-bullseye",
        side: "origin",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "miss",
        kind: "attack",
        label: "REMINDERS.trigger.miss",
        icon: "fa-solid fa-wind",
        side: "origin",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "critMiss",
        kind: "attack",
        label: "REMINDERS.trigger.critMiss",
        icon: "fa-solid fa-face-dizzy",
        side: "origin",
        outcomes: ["criticalFailure"],
    },
    {
        id: "wasHit",
        kind: "attack",
        label: "REMINDERS.trigger.wasHit",
        icon: "fa-solid fa-shield-halved",
        side: "target",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "wasCritted",
        kind: "attack",
        label: "REMINDERS.trigger.wasCritted",
        icon: "fa-solid fa-heart-crack",
        side: "target",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "wasMissed",
        kind: "attack",
        label: "REMINDERS.trigger.wasMissed",
        icon: "fa-solid fa-person-running",
        side: "target",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "wasCritMissed",
        kind: "attack",
        label: "REMINDERS.trigger.wasCritMissed",
        icon: "fa-solid fa-user-shield",
        side: "target",
        outcomes: ["criticalFailure"],
    },
];

/** The turn triggers in the order they fire when a turn changes. */
export const TRIGGERS_IN_FIRING_ORDER = TRIGGERS.filter((trigger) => trigger.kind === "turn")
    .sort((a, b) => a.fireOrder - b.fireOrder);

/**
 * The attack triggers a PF2e attack roll message fires, with the actor and token (uuids) each one concerns.
 * `context` is the message's `flags.pf2e.context`; it has an outcome only when the roll had a target to hit.
 */
export function attackTriggersOf(context) {
    if (context?.type !== "attack-roll") return [];
    return TRIGGERS
        .filter((trigger) => trigger.kind === "attack" && trigger.outcomes.includes(context.outcome) && context[trigger.side]?.actor)
        .map((trigger) => ({ trigger, actorUuid: context[trigger.side].actor, tokenUuid: context[trigger.side].token }));
}

/** Messages of one group replace each other: a new turn message makes the old ones past, a new hit the old hit. */
export function supersedeGroup(id) {
    return getTrigger(id).kind === "turn" ? "turn" : getTrigger(id).id;
}

/** Reminders made before triggers existed have no trigger and fire at the start of the turn. */
export const DEFAULT_TRIGGER = "turnStart";

export function triggerOf(reminder) {
    return reminder.trigger ?? DEFAULT_TRIGGER;
}

export function getTrigger(id) {
    return TRIGGERS.find((trigger) => trigger.id === id) ?? TRIGGERS.find((trigger) => trigger.id === DEFAULT_TRIGGER);
}

export function triggerLabel(id) {
    return game.i18n.localize(getTrigger(id).label);
}

export function triggerIcon(id) {
    return getTrigger(id).icon;
}
