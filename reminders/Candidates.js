import { showsReminderControls } from "./Availability";

const MAX_CANDIDATES = 8;

function isOwned(actor, user) {
    return Boolean(actor?.testUserPermission(user, "OWNER")) && showsReminderControls(actor);
}

/**
 * For the GM every actor is owned, so player-owned actors are left out unless explicitly selected.
 */
function isActorOfUser(actor, user) {
    return isOwned(actor, user) && (!user.isGM || !actor.hasPlayerOwner);
}

function unique(actors) {
    return [...new Map(actors.map((actor) => [actor.id, actor])).values()];
}

/**
 * The actors a chat reminder can be added for (NPCs only when the GM has turned NPC controls on): selected tokens first, then your combatants,
 * then your tokens on the scene, then your assigned character.
 */
export function getCandidateActors(user = game.user) {
    const selected = (globalThis.canvas?.tokens?.controlled ?? []).map((token) => token.actor).filter((actor) => isOwned(actor, user));
    const inCombat = (game.combat?.combatants ?? []).map((combatant) => combatant.actor).filter((actor) => isActorOfUser(actor, user));
    const onScene = (globalThis.canvas?.scene?.tokens ?? []).map((token) => token.actor).filter((actor) => isActorOfUser(actor, user));
    const character = user.character ? [user.character] : [];

    for (const actors of [selected, inCombat, onScene, character]) {
        if (actors.length) return unique(actors).slice(0, MAX_CANDIDATES);
    }
    return [];
}

/**
 * What a new chat reminder can be added for: one target per candidate actor. Without actors there is none.
 */
export function getReminderTargets(user = game.user) {
    return getCandidateActors(user).map((actor) => ({ actorUuid: actor.uuid, name: actor.name }));
}

export { MAX_CANDIDATES };
