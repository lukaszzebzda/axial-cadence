import { hashString, mulberry32 } from '../utils/random.js';
import { rotate, getPatternPool } from './patterns.js';
import { selectInitialSideCount, selectNextSideCount } from './geometrySelection.js';
import { SEQUENCE_CATALOGUE } from '../sequences/sequenceCatalogue.js';
import { selectSequence } from '../sequences/sequenceSelection.js';
/**
 * Deterministic obstacle generator driven by a text seed.
 *
 * Game calls nextInitialGeometry() once before spawning and after every reset.
 * It consumes the first value from the same PRNG, then applies the selected pool.
 * Each call to nextWall() draws two values from the PRNG:
 *   1. pattern index — which shape from the full pool for this sideCount
 *   2. rotation offset — where on the ring the gap starts
 * Each call to nextGeometry() draws one value from that same PRNG after the
 * automatic schedule expires and before the transition warning begins.
 * Opt-in nextSequence() draws once from the same PRNG when candidates exist.
 *
 * The full pool is used (no difficulty filter) so every seed produces full
 * pattern variety and the sequence is strictly reproducible.
 *
 * reset() rewinds the PRNG to the original seed so the same wall sequence
 * replays on every run — which is the point of seeded mode.
 *
 * Geometry draws intentionally shift all later wall draws. The complete wall
 * and geometry sequence remains deterministic for an identical simulation.
 *
 * @param {string} textSeed
 * @param {number} [sideCount=6]
 * @returns {import('./generatorInterface.js').Generator}
 */
export function createSeededGenerator(textSeed, sideCount = 6) {
    const numericSeed = hashString(textSeed);
    let pool = getPatternPool(sideCount);
    let rng = mulberry32(numericSeed);
    return {
        nextInitialGeometry() {
            return selectInitialSideCount(rng());
        },
        nextWall() {
            const idx = Math.floor(rng() * pool.length);
            const segments = pool[idx].segments;
            const offset = Math.floor(rng() * segments.length);
            return { segments: rotate(segments, offset) };
        },
        nextGeometry(currentSideCount) {
            return selectNextSideCount(currentSideCount, rng());
        },
        nextSequence(sideCount, difficulty, previousSequenceId) {
            return selectSequence({
                catalogue: SEQUENCE_CATALOGUE, sideCount, difficulty, previousSequenceId,
                rng: () => rng(),
            });
        },
        reset() {
            rng = mulberry32(numericSeed);
        },
        // Pool changes do not consume RNG; nextGeometry() is the explicit geometry draw.
        setSideCount(nextSideCount) {
            pool = getPatternPool(nextSideCount);
        },
    };
}
