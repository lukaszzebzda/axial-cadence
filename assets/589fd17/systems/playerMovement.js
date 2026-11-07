import { updatePlayer } from '../entities/player.js';
import { checkCollision } from './collision.js';
const CONTACT_SEARCH_STEPS = 12;
/**
 * Player steering is resolved against walls at their current positions.
 * The later world step may still move a wall into the player and end the run.
 */
export function movePlayerAgainstWalls(player, dt, input, walls) {
    // An existing overlap belongs to the lethal world collision check.
    // The contact search requires a safe starting angle.
    if (walls.length > 0 && checkCollision(player, walls))
        return;
    const start = player.angle;
    updatePlayer(player, dt, input);
    const delta = player.angle - start;
    if (delta === 0 || walls.length === 0)
        return;
    player.angle = start;
    // The arc sample is at most half the player's radius. This also catches
    // narrow side contacts that lie between the tick's start and end angles.
    const samples = Math.max(1, Math.ceil(Math.abs(delta) * player.radius / Math.max(player.size / 2, 1)));
    let safe = start;
    for (let sample = 1; sample <= samples; sample++) {
        const candidate = start + delta * sample / samples;
        player.angle = candidate;
        if (!checkCollision(player, walls)) {
            safe = candidate;
            continue;
        }
        let blocked = candidate;
        for (let step = 0; step < CONTACT_SEARCH_STEPS; step++) {
            const middle = (safe + blocked) / 2;
            player.angle = middle;
            if (checkCollision(player, walls))
                blocked = middle;
            else
                safe = middle;
        }
        player.angle = safe;
        return;
    }
}
