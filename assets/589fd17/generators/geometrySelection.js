import { SUPPORTED_SIDE_COUNTS } from '../layout.js';
export function selectNextSideCount(currentSideCount, randomValue, supportedSideCounts = SUPPORTED_SIDE_COUNTS) {
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
        throw new Error(`Geometry selection requires a random value in [0, 1): ${randomValue}`);
    }
    const candidates = supportedSideCounts.filter(sideCount => sideCount !== currentSideCount);
    if (candidates.length === 0) {
        throw new Error(`No alternate geometry available for side count ${currentSideCount}.`);
    }
    return candidates[Math.floor(randomValue * candidates.length)];
}
/** Initial geometry includes every supported polygon; subsequent changes exclude the current one. */
export function selectInitialSideCount(randomValue, supportedSideCounts = SUPPORTED_SIDE_COUNTS) {
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
        throw new Error(`Geometry selection requires a random value in [0, 1): ${randomValue}`);
    }
    if (supportedSideCounts.length === 0)
        throw new Error('No initial geometry available.');
    return supportedSideCounts[Math.floor(randomValue * supportedSideCounts.length)];
}
