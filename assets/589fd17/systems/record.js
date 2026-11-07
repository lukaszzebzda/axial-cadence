import { GAME_MODES } from '../game/GameMode.js';
export function createBestScoreRecord({ load = (_mode) => 0, save = (_score, _mode) => { }, } = {}) {
    const records = new Map();
    for (const mode of GAME_MODES) {
        let best = 0;
        try {
            const loaded = load(mode);
            if (Number.isFinite(loaded) && loaded >= 0)
                best = loaded;
        }
        catch {
            // A failed mode read must not prevent loading the other records.
        }
        records.set(mode, best);
    }
    return {
        getBestScore: mode => records.get(mode) ?? 0,
        submitScore(score, mode) {
            const best = records.get(mode);
            if (best === undefined || !Number.isFinite(score) || score < 0 || score <= best)
                return;
            records.set(mode, score);
            try {
                save(score, mode);
            }
            catch {
                // Keep the record in memory when persistence is unavailable.
            }
        },
    };
}
