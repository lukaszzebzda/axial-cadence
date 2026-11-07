import { smoothstep01 } from '../utils/easing.js';
/**
 * Difficulty progression — pure, no side effects.
 *
 * All tuning lives in DIFFICULTY_CONFIG. To rebalance:
 *   - rampDuration: how many seconds until max difficulty is reached.
 *   - Each parameter has a start (t=0) and end (t=1) value.
 *     The base curve is linear; the minute milestone adds a smooth 6 s boost.
 *
 * computeDifficulty is called every world tick with the current score.
 * Pass enabled=false to freeze difficulty at base values (used by training mode).
 */
export const DIFFICULTY_CONFIG = {
    escalation: { at: 60, duration: 6, wallSpeedBonus: 24, spawnIntervalReduction: 0.1 },
    rampDuration: 120, // seconds to reach t = 1
    wallSpeed: { start: 228, end: 294 }, // reference px/s at FullHD (1080p); scaled by layout.unit at runtime
    rotationSpeed: { start: 0.75, end: 1.5 }, // peak magnitude in rad/s; direction is owned by worldRotation.ts
    spawnEvery: { start: 1.16, end: 0.84 }, // seconds between walls
};
/**
 * @param {number}  score    Current score (seconds survived).
 * @param {boolean} [enabled=true]  False freezes t at 0 (base values).
 */
export function computeDifficulty(score, enabled = true) {
    const t = enabled ? Math.min(score / DIFFICULTY_CONFIG.rampDuration, 1) : 0;
    const c = DIFFICULTY_CONFIG;
    const escalation = enabled
        ? smoothstep01((score - c.escalation.at) / c.escalation.duration) : 0;
    return {
        stage: enabled && score >= c.escalation.at ? 2 : 1,
        t,
        wallSpeed: lerp(c.wallSpeed.start, c.wallSpeed.end, t) + c.escalation.wallSpeedBonus * escalation,
        rotationSpeed: lerp(c.rotationSpeed.start, c.rotationSpeed.end, t),
        spawnEvery: lerp(c.spawnEvery.start, c.spawnEvery.end, t) - c.escalation.spawnIntervalReduction * escalation,
    };
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
