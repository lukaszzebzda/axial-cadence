const LEGACY_BEST_KEY = 'hex_best_global';
const BEST_KEYS = {
    RANDOM: 'axial_best_random', SEEDED: 'axial_best_seeded', TRAINING: 'axial_best_training',
};
export function loadBestScore(mode) {
    const key = BEST_KEYS[mode];
    return key ? readScore(key) : 0;
}
// The old record has no mode metadata. Keep it as read-only history, rather
// than assigning a possibly easier training score to a competitive mode.
export function loadLegacyBestScore() { return readScore(LEGACY_BEST_KEY); }
function readScore(key) {
    try {
        // Access to localStorage itself can throw, not just getItem().
        const raw = localStorage.getItem(key);
        const score = raw === null ? 0 : Number(raw);
        return isValidScore(score) ? score : 0;
    }
    catch {
        return 0;
    }
}
export function saveBestScore(score, mode) {
    const key = BEST_KEYS[mode];
    if (!key || !isValidScore(score))
        return;
    try {
        localStorage.setItem(key, String(score));
    }
    catch {
        // The record service retains the session record; persistence cannot interrupt game over.
    }
}
function isValidScore(score) {
    return Number.isFinite(score) && score >= 0;
}
