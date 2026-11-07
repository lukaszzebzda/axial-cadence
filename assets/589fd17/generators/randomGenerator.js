import { rotate, getPatternPool } from './patterns.js';
import { selectNextSideCount } from './geometrySelection.js';
import { SEQUENCE_CATALOGUE } from '../sequences/sequenceCatalogue.js';
import { selectSequence } from '../sequences/sequenceSelection.js';
/**
 * @param {number} [sideCount=6]
 * @returns {import('./generatorInterface.js').Generator}
 */
export function createRandomGenerator(sideCount = 6) {
    let pool = getPatternPool(sideCount);
    return {
        /**
         * @param {number} [t=0]  Difficulty progress in [0, 1].
         * Patterns with minT <= t are eligible. Harder patterns unlock as t rises.
         * See getPatternPool() in patterns.js to adjust which patterns appear when.
         */
        nextWall(t = 0) {
            const available = pool.filter(p => t >= p.minT);
            const { segments } = available[Math.floor(Math.random() * available.length)];
            return { segments: rotate(segments, Math.floor(Math.random() * segments.length)) };
        },
        nextGeometry(currentSideCount) {
            return selectNextSideCount(currentSideCount, Math.random());
        },
        nextSequence(sideCount, difficulty, previousSequenceId) {
            return selectSequence({
                catalogue: SEQUENCE_CATALOGUE, sideCount, difficulty, previousSequenceId,
                rng: Math.random,
            });
        },
        reset() { },
        setSideCount(nextSideCount) {
            pool = getPatternPool(nextSideCount);
        },
    };
}
