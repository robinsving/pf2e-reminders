/**
 * The moments a reminder can fire on. Turn triggers say which combatant they concern, given what Foundry reports
 * for a turn change: the previous and the current combat state. Check triggers fire on a PF2e attack roll or
 * saving throw message and say which side of the roll they concern (the origin or the target) and which outcomes
 * count. For a saving throw the target is the one who rolled the save.
 */
export const TRIGGERS = [
    {
        id: "turnStart",
        kind: "turn",
        group: "turn",
        label: "REMINDERS.trigger.turnStart",
        icon: "fa-solid fa-hourglass-start",
        fireOrder: 1,
        combatantOf: (combat, _previous, current) => combat.combatants.get(current?.combatantId),
    },
    {
        id: "turnEnd",
        kind: "turn",
        group: "turn",
        label: "REMINDERS.trigger.turnEnd",
        icon: "fa-solid fa-hourglass-end",
        fireOrder: 0, // the end of a turn comes before the start of the next
        combatantOf: (combat, previous) => combat.combatants.get(previous?.combatantId),
    },
    {
        id: "hit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.hit",
        icon: "fa-solid fa-crosshairs",
        side: "origin",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "crit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.crit",
        icon: "fa-solid fa-bullseye",
        side: "origin",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "miss",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.miss",
        icon: "fa-solid fa-wind",
        side: "origin",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "critMiss",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.critMiss",
        icon: "fa-solid fa-face-dizzy",
        side: "origin",
        outcomes: ["criticalFailure"],
    },
    {
        id: "wasHit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasHit",
        icon: "fa-solid fa-shield-halved",
        side: "target",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "wasCritted",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasCritted",
        icon: "fa-solid fa-heart-crack",
        side: "target",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "wasMissed",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasMissed",
        icon: "fa-solid fa-person-running",
        side: "target",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "wasCritMissed",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasCritMissed",
        icon: "fa-solid fa-user-shield",
        side: "target",
        outcomes: ["criticalFailure"],
    },
    {
        id: "saveSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveSuccess",
        icon: "fa-solid fa-circle-check",
        side: "target",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "saveCritSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveCritSuccess",
        icon: "fa-solid fa-trophy",
        side: "target",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "saveFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveFailure",
        icon: "fa-solid fa-circle-xmark",
        side: "target",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "saveCritFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveCritFailure",
        icon: "fa-solid fa-skull",
        side: "target",
        outcomes: ["criticalFailure"],
    },
];

/** The groups the triggers are listed under, in order. */
export const TRIGGER_GROUPS = ["turn", "attack", "save"];

export const TRIGGER_GROUP_LABELS = {
    turn: "REMINDERS.trigger.group.turn",
    attack: "REMINDERS.trigger.group.attack",
    save: "REMINDERS.trigger.group.save",
};

/** The turn triggers in the order they fire when a turn changes. */
export const TRIGGERS_IN_FIRING_ORDER = TRIGGERS.filter((trigger) => trigger.kind === "turn")
    .sort((a, b) => a.fireOrder - b.fireOrder);

/**
 * The check triggers a PF2e attack roll or saving throw message fires, with the actor and token (uuids) each one
 * concerns. `context` is the message's `flags.pf2e.context`; it has an outcome only when the roll had a DC.
 */
export function checkTriggersOf(context) {
    if (!context?.type) return [];
    return TRIGGERS
        .filter((trigger) => trigger.kind === "check" && trigger.rollType === context.type
            && trigger.outcomes.includes(context.outcome) && context[trigger.side]?.actor)
        .map((trigger) => ({ trigger, actorUuid: context[trigger.side].actor, tokenUuid: context[trigger.side].token }));
}

/** Messages of one group replace each other: a new turn message makes the old ones past, a new hit the old hit, a new save the old save. */
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
