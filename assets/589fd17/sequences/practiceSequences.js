export const REVEAL_PRACTICE_SEQUENCE = Object.freeze({
    name: 'REVEAL_PRACTICE',
    replayDelay: 1.5,
    entries: Object.freeze([
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 0, spacing: 1.55 }),
        Object.freeze({ pattern: 'SINGLE_GAP', rotation: 2, spacing: 1.65 }),
        Object.freeze({
            pattern: 'CLOSED',
            rotation: 0,
            spacing: 1.2,
            choreography: Object.freeze({
                type: 'CLOSED_REVEAL',
                revealPattern: 'DOUBLE_ADJACENT',
                revealRotation: 3,
            }),
        }),
        Object.freeze({ pattern: 'SINGLE_GAP', rotation: 3, spacing: 1.35 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 3, spacing: 0 }),
    ]),
});
// Starts around the player's reset angle, alternates across the orbit, then
// advances one sector at a time before narrowing onto the leading corridor lane.
export const ALTERNATING_CORRIDOR_SEQUENCE = Object.freeze({
    name: 'ALTERNATING_CORRIDOR',
    replayDelay: 1.5,
    entries: Object.freeze([
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: -1, spacing: 1.55 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 1, spacing: 1.55 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: -1, spacing: 1.55 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 1, spacing: 1.35 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 2, spacing: 1.25 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 3, spacing: 1.30 }),
        Object.freeze({ pattern: 'SINGLE_GAP', rotation: 4, spacing: 1.30 }),
        Object.freeze({ pattern: 'SINGLE_GAP', rotation: 5, spacing: 1.45 }),
        Object.freeze({ pattern: 'DOUBLE_ADJACENT', rotation: 5, spacing: 0 }),
    ]),
});
const FORK_AND_CONVERGE_NAME = 'FORK_AND_CONVERGE';
export const FORK_AND_CONVERGE_SEQUENCE = Object.freeze({
    name: FORK_AND_CONVERGE_NAME,
    variants: Object.freeze({
        4: createForkVariant(4, [
            { pattern: 'DOUBLE_ADJACENT', rotation: -1, spacing: 1.75 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.55 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.50 },
            { pattern: 'DOUBLE_ADJACENT', rotation: 0, spacing: 1.45 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.40 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.50 },
            { pattern: 'DOUBLE_ADJACENT', rotation: -1, spacing: 0 },
        ]),
        5: createForkVariant(5, [
            { pattern: 'TRIPLE_ADJACENT', rotation: 4, spacing: 1.75 },
            { pattern: 'DOUBLE_SKIP1', rotation: 0, spacing: 1.55 },
            { pattern: 'DOUBLE_SKIP1', rotation: 0, spacing: 1.50 },
            { pattern: 'TRIPLE_SPREAD', rotation: 0, spacing: 1.50 },
            { pattern: 'DOUBLE_ADJACENT', rotation: 0, spacing: 1.45 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.40 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.50 },
            { pattern: 'TRIPLE_ADJACENT', rotation: 4, spacing: 0 },
        ]),
        6: createForkVariant(6, [
            { pattern: 'TRIPLE_ADJACENT', rotation: 5, spacing: 1.75 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.55 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.50 },
            { pattern: 'TRIPLE_MIXED', rotation: 0, spacing: 1.50 },
            { pattern: 'DOUBLE_SKIP1', rotation: 0, spacing: 1.45 },
            { pattern: 'DOUBLE_ADJACENT', rotation: 0, spacing: 1.40 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.35 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.50 },
            { pattern: 'TRIPLE_ADJACENT', rotation: 5, spacing: 0 },
        ]),
        8: createForkVariant(8, [
            { pattern: 'QUAD_ADJACENT', rotation: 6, spacing: 1.80 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.60 },
            { pattern: 'DOUBLE_OPPOSITE', rotation: 0, spacing: 1.55 },
            { pattern: 'TRIPLE_SPREAD', rotation: 0, spacing: 1.50 },
            { pattern: 'DOUBLE_ADJACENT', rotation: 0, spacing: 1.45 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.40 },
            { pattern: 'SINGLE_GAP', rotation: 0, spacing: 1.55 },
            { pattern: 'QUAD_ADJACENT', rotation: 6, spacing: 0 },
        ]),
    }),
});
// Two clockwise turns. Double gaps overlap by one sector between walls.
// Twelve seconds of authored spacing keeps angular demand at ~1.05 rad/s
// on every polygon, below the player's 3 rad/s steering speed.
export const SPIRAL_SEQUENCE = Object.freeze({
    name: 'SPIRAL',
    variants: Object.freeze(Object.fromEntries([4, 5, 6, 8].map(sideCount => [sideCount,
        Object.freeze({
            name: 'SPIRAL', variantSideCount: sideCount, replayDelay: 2,
            entries: Object.freeze(Array.from({ length: sideCount * 2 + 1 }, (_, index) => Object.freeze({
                pattern: 'DOUBLE_ADJACENT', rotation: index - 1,
                spacing: index === sideCount * 2 ? 0 : 12 / (sideCount * 2),
            }))),
        }),
    ]))),
});
export const HALF_ARENA_SEQUENCE = Object.freeze({
    name: 'HALF_ARENA',
    variants: Object.freeze(Object.fromEntries([4, 5, 6, 8].map(sideCount => [sideCount,
        Object.freeze({
            name: 'HALF_ARENA', variantSideCount: sideCount, replayDelay: 2,
            entries: Object.freeze([
                Object.freeze({ pattern: 'HALF_ARENA', rotation: 0, thickness: 1100,
                    role: 'barrier', spacing: 0.8 }),
                ...[0, 1, 0, 1, 0].map((rotation, index) => Object.freeze({
                    pattern: 'SINGLE_GAP', rotation, thickness: index === 2 ? 52 : 26,
                    spacing: index === 4 ? 0 : Math.max(0.65, 2 * Math.PI / sideCount / 1.4),
                })),
            ]),
        }),
    ]))),
});
export const SEQUENCE_DEMOS = Object.freeze({
    half: HALF_ARENA_SEQUENCE,
    spiral: SPIRAL_SEQUENCE,
    reveal: REVEAL_PRACTICE_SEQUENCE,
    alternating: ALTERNATING_CORRIDOR_SEQUENCE,
    fork: FORK_AND_CONVERGE_SEQUENCE,
});
export function resolveSequenceDemo(value) {
    if (value === null)
        return null;
    const key = value === '' ? 'reveal' : value.toLowerCase();
    return SEQUENCE_DEMOS[key] ?? null;
}
function createForkVariant(sideCount, entries) {
    return Object.freeze({
        name: FORK_AND_CONVERGE_NAME,
        variantSideCount: sideCount,
        replayDelay: 1.5,
        entries: Object.freeze(entries.map(entry => Object.freeze(entry))),
    });
}
