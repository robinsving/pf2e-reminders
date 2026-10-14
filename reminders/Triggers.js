/**
 * The moments a reminder can fire on. Turn triggers say which combatant they concern, given what Foundry reports
 * for a turn change: the previous and the current combat state. Check triggers fire on a PF2e attack roll or
 * saving throw message and say which side of the roll they concern (the origin or the target) and which outcomes
 * count. For a saving throw the target is the one who rolled the save and the origin the source of the effect.
 */
/**
 * The icon says what happened and the colour how it went: one icon for each kind of event, in PF2e's own colours for
 * the degrees of success (see the stylesheet).
 */
const CATEGORY_ICONS = {
    hitting: "fa-crosshairs",
    gettingHit: "fa-shield-halved",
    saving: "fa-heart-pulse",
    savedAgainst: "fa-wand-sparkles",
};

/** The headings the triggers of a roll are listed under within their tab, by who the roll concerns. */
export const TRIGGER_CATEGORY_LABELS = {
    hitting: "REMINDERS.trigger.category.hitting",
    gettingHit: "REMINDERS.trigger.category.gettingHit",
    saving: "REMINDERS.trigger.category.saving",
    savedAgainst: "REMINDERS.trigger.category.savedAgainst",
};

const OUTCOME_CLASSES = {
    success: "pf2e-reminders-success",
    criticalSuccess: "pf2e-reminders-critical-success",
    failure: "pf2e-reminders-failure",
    criticalFailure: "pf2e-reminders-critical-failure",
};

const outcomeIcon = (category, outcome) => `fa-solid ${CATEGORY_ICONS[category]} ${OUTCOME_CLASSES[outcome]}`;

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
        id: "crit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.crit",
        category: "hitting",
        icon: outcomeIcon("hitting", "criticalSuccess"),
        side: "origin",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "hit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.hit",
        category: "hitting",
        icon: outcomeIcon("hitting", "success"),
        side: "origin",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "miss",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.miss",
        category: "hitting",
        icon: outcomeIcon("hitting", "failure"),
        side: "origin",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "critMiss",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.critMiss",
        category: "hitting",
        icon: outcomeIcon("hitting", "criticalFailure"),
        side: "origin",
        outcomes: ["criticalFailure"],
    },
    {
        id: "wasCritted",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasCritted",
        category: "gettingHit",
        icon: outcomeIcon("gettingHit", "criticalSuccess"),
        side: "target",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "wasHit",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasHit",
        category: "gettingHit",
        icon: outcomeIcon("gettingHit", "success"),
        side: "target",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "wasMissed",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasMissed",
        category: "gettingHit",
        icon: outcomeIcon("gettingHit", "failure"),
        side: "target",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "wasCritMissed",
        kind: "check",
        group: "attack",
        rollType: "attack-roll",
        label: "REMINDERS.trigger.wasCritMissed",
        category: "gettingHit",
        icon: outcomeIcon("gettingHit", "criticalFailure"),
        side: "target",
        outcomes: ["criticalFailure"],
    },
    {
        id: "saveCritSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveCritSuccess",
        category: "saving",
        icon: outcomeIcon("saving", "criticalSuccess"),
        side: "target",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "saveSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveSuccess",
        category: "saving",
        icon: outcomeIcon("saving", "success"),
        side: "target",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "saveFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveFailure",
        category: "saving",
        icon: outcomeIcon("saving", "failure"),
        side: "target",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "saveCritFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveCritFailure",
        category: "saving",
        icon: outcomeIcon("saving", "criticalFailure"),
        side: "target",
        outcomes: ["criticalFailure"],
    },
    {
        id: "saveAgainstCritSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveAgainstCritSuccess",
        category: "savedAgainst",
        icon: outcomeIcon("savedAgainst", "criticalSuccess"),
        side: "origin",
        outcomes: ["criticalSuccess"],
    },
    {
        id: "saveAgainstSuccess",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveAgainstSuccess",
        category: "savedAgainst",
        icon: outcomeIcon("savedAgainst", "success"),
        side: "origin",
        outcomes: ["success", "criticalSuccess"],
    },
    {
        id: "saveAgainstFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveAgainstFailure",
        category: "savedAgainst",
        icon: outcomeIcon("savedAgainst", "failure"),
        side: "origin",
        outcomes: ["failure", "criticalFailure"],
    },
    {
        id: "saveAgainstCritFailure",
        kind: "check",
        group: "save",
        rollType: "saving-throw",
        label: "REMINDERS.trigger.saveAgainstCritFailure",
        category: "savedAgainst",
        icon: outcomeIcon("savedAgainst", "criticalFailure"),
        side: "origin",
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

/** The icon of a trigger without its outcome colour, for lists that show every trigger the same way. */
export function triggerIconPlain(id) {
    return triggerIcon(id).split(" ").filter((name) => !name.startsWith("pf2e-reminders-")).join(" ");
}
