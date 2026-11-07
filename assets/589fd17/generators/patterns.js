/**
 * Wall pattern catalogue — the single source of truth for obstacle shapes.
 *
 * Every pattern is a canonical segment array: 0 = gap, 1 = wall.
 * "Canonical" means the first gap is at sector 0. Use rotate() to place a
 * pattern at any starting angle.
 *
 * Patterns are nested by sideCount so each generator can work with the correct
 * set of shapes without knowing about other side counts.
 *
 * Adding a new pattern for an existing sideCount:
 *   1. Add it to PATTERNS[n] with a descriptive name.
 *   2. Add it to the corresponding POOL_n with a minT threshold.
 *   3. Use it in TRAINING_SEQUENCE if appropriate.
 *
 * Adding a new sideCount:
 *   1. Add a PATTERNS[n] block with canonical shapes.
 *   2. Build a POOL_n array ordered by increasing minT.
 *   3. Register it in PATTERN_POOLS.
 */
// ─── canonical shapes ─────────────────────────────────────────────────────────
export const PATTERNS = {
    4: {
        // 2 gaps — easy (90° each gap = half the ring)
        DOUBLE_ADJACENT: [0, 0, 1, 1], // two consecutive gaps
        DOUBLE_OPPOSITE: [0, 1, 0, 1], // gaps on opposite sides
        // 1 gap — hard (90° window)
        SINGLE_GAP: [0, 1, 1, 1],
    },
    5: {
        // 3 gaps — easy
        TRIPLE_ADJACENT: [0, 0, 0, 1, 1], // three consecutive gaps
        TRIPLE_SPREAD: [0, 0, 1, 0, 1], // two adjacent + one separate
        // 2 gaps — medium
        DOUBLE_ADJACENT: [0, 0, 1, 1, 1], // two consecutive gaps
        DOUBLE_SKIP1: [0, 1, 0, 1, 1], // two gaps with one wall between
        // 1 gap — hard
        SINGLE_GAP: [0, 1, 1, 1, 1],
    },
    6: {
        // 3 gaps — easy (180° or 3×60° of open space)
        TRIPLE_ALTERNATING: [0, 1, 0, 1, 0, 1], // every other sector open
        TRIPLE_ADJACENT: [0, 0, 0, 1, 1, 1], // three consecutive gaps
        TRIPLE_MIXED: [0, 0, 1, 0, 1, 1], // two adjacent + one separate
        // 2 gaps — medium (120° or 2×60° of open space)
        DOUBLE_ADJACENT: [0, 0, 1, 1, 1, 1], // two consecutive gaps
        DOUBLE_SKIP1: [0, 1, 0, 1, 1, 1], // two gaps with one wall between
        DOUBLE_OPPOSITE: [0, 1, 1, 0, 1, 1], // gaps on opposite sides
        // 1 gap — hardest (60° of open space)
        SINGLE_GAP: [0, 1, 1, 1, 1, 1],
    },
    8: {
        // 4 gaps — easy
        QUAD_ADJACENT: [0, 0, 0, 0, 1, 1, 1, 1], // four consecutive gaps
        QUAD_ALTERNATING: [0, 1, 0, 1, 0, 1, 0, 1], // every other sector open
        // 3 gaps — medium-easy
        TRIPLE_ADJACENT: [0, 0, 0, 1, 1, 1, 1, 1], // three consecutive gaps
        TRIPLE_SPREAD: [0, 0, 1, 0, 1, 1, 1, 1], // two adjacent + one separate
        // 2 gaps — medium
        DOUBLE_ADJACENT: [0, 0, 1, 1, 1, 1, 1, 1], // two consecutive gaps
        DOUBLE_SKIP2: [0, 1, 1, 0, 1, 1, 1, 1], // two gaps with two walls between
        DOUBLE_OPPOSITE: [0, 1, 1, 1, 0, 1, 1, 1], // gaps on opposite sides
        // 1 gap — hardest
        SINGLE_GAP: [0, 1, 1, 1, 1, 1, 1, 1],
    },
};
// Authored arena constraint, excluded from the ordinary random pools.
for (const sides of [4, 5, 6, 8]) {
    PATTERNS[sides].HALF_ARENA = Array.from({ length: sides }, (_, index) => index < Math.ceil(sides / 2) ? 0 : 1);
}
// ─── rotation ─────────────────────────────────────────────────────────────────
/**
 * Rotates a segment array by k positions clockwise.
 * rotate([0,1,1,1,1,1], 1) → [1,0,1,1,1,1]  (gap shifts from sector 0 to sector 1)
 *
 * @param {number[]} segs  segment array (any length)
 * @param {number}   k     integer rotation offset; wraps to the pattern length
 * @returns {number[]}     new array, does not mutate segs
 */
export function rotate(segs, k) {
    const n = segs.length;
    const offset = ((k % n) + n) % n;
    return Array.from({ length: n }, (_, i) => segs[(i - offset + n) % n]);
}
// ─── pattern pools ────────────────────────────────────────────────────────────
/**
 * Each pool is an ordered array of { segments, minT } entries.
 * Patterns unlock as difficulty t increases from 0 → 1.
 * Generators pick uniformly from all entries where t >= minT.
 *
 * Rebalancing guide:
 *   - Lower a minT to introduce a pattern earlier.
 *   - Raise a minT to delay it.
 *   - Add duplicate entries to increase a pattern's frequency.
 */
const { DOUBLE_ADJACENT: DA4, DOUBLE_OPPOSITE: DO4, SINGLE_GAP: SG4 } = PATTERNS[4];
const POOL_4 = [
    { segments: DA4, minT: 0 },
    { segments: DO4, minT: 0 },
    { segments: SG4, minT: 0.65 },
];
const { TRIPLE_ADJACENT: TA5, TRIPLE_SPREAD: TS5, DOUBLE_ADJACENT: DA5, DOUBLE_SKIP1: DS5, SINGLE_GAP: SG5 } = PATTERNS[5];
const POOL_5 = [
    { segments: TA5, minT: 0 },
    { segments: DA5, minT: 0 },
    { segments: DS5, minT: 0 },
    { segments: TS5, minT: 0.20 },
    { segments: SG5, minT: 0.65 },
];
// POOL_6 preserves the exact order and entries of the original PATTERN_POOL
// so that all SEEDED mode seed sequences remain deterministic at sideCount=6.
const { TRIPLE_ALTERNATING, TRIPLE_ADJACENT: TA6, TRIPLE_MIXED, DOUBLE_ADJACENT: DA6, DOUBLE_SKIP1: DS6, DOUBLE_OPPOSITE: DO6, SINGLE_GAP: SG6 } = PATTERNS[6];
const POOL_6 = [
    { segments: TRIPLE_ALTERNATING, minT: 0 },
    { segments: TA6, minT: 0 },
    { segments: DA6, minT: 0 },
    { segments: DS6, minT: 0 },
    { segments: TRIPLE_MIXED, minT: 0.20 },
    { segments: DO6, minT: 0.40 },
    { segments: SG6, minT: 0.65 },
];
const { QUAD_ADJACENT, QUAD_ALTERNATING, TRIPLE_ADJACENT: TA8, TRIPLE_SPREAD: TS8, DOUBLE_ADJACENT: DA8, DOUBLE_SKIP2, DOUBLE_OPPOSITE: DO8, SINGLE_GAP: SG8 } = PATTERNS[8];
const POOL_8 = [
    { segments: QUAD_ADJACENT, minT: 0 },
    { segments: QUAD_ALTERNATING, minT: 0 },
    { segments: TA8, minT: 0 },
    { segments: DA8, minT: 0 },
    { segments: TS8, minT: 0.20 },
    { segments: DOUBLE_SKIP2, minT: 0.40 },
    { segments: DO8, minT: 0.40 },
    { segments: SG8, minT: 0.65 },
];
const PATTERN_POOLS = { 4: POOL_4, 5: POOL_5, 6: POOL_6, 8: POOL_8 };
export function getCanonicalPatterns(sideCount) {
    const patterns = PATTERNS[sideCount];
    if (!patterns)
        throw new Error(`No patterns defined for side count ${sideCount}.`);
    return Object.values(patterns);
}
/**
 * Returns the pattern pool for a given sideCount.
 * @param {number} sideCount
 * @returns {{ segments: number[], minT: number }[]}
 */
export function getPatternPool(sideCount) {
    const pool = PATTERN_POOLS[sideCount];
    if (!pool)
        throw new Error(`No pattern pool defined for side count ${sideCount}.`);
    return pool;
}
