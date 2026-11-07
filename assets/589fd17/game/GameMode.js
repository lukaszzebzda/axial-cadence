export const GameMode = Object.freeze({
    RANDOM: 'RANDOM',
    SEEDED: 'SEEDED',
    TRAINING: 'TRAINING',
});
// Ordered for ← → cycling on the start screen.
// Append new modes here to make them selectable automatically.
export const GAME_MODES = [GameMode.RANDOM, GameMode.SEEDED, GameMode.TRAINING];
const GAME_MODE_RULES = Object.freeze({
    [GameMode.RANDOM]: Object.freeze({ pauseWhenHidden: true }),
    [GameMode.SEEDED]: Object.freeze({ pauseWhenHidden: true }),
    [GameMode.TRAINING]: Object.freeze({ pauseWhenHidden: true }),
});
export function shouldPauseWhenHidden(mode) {
    return GAME_MODE_RULES[mode]?.pauseWhenHidden ?? true;
}
