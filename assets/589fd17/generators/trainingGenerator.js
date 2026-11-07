import { PATTERNS, rotate } from './patterns.js';
const { TRIPLE_ALTERNATING, TRIPLE_ADJACENT, TRIPLE_MIXED, DOUBLE_ADJACENT, DOUBLE_SKIP1, DOUBLE_OPPOSITE, SINGLE_GAP, } = PATTERNS[6];
/**
 * Hand-authored wall sequence for training mode.
 * Written in terms of named patterns + rotations so the intent of each wall
 * is obvious at a glance.
 *
 * Phases:
 *   Phase 1 (walls 0–3):  triple gaps — learn the rotation mechanics
 *   Phase 2 (walls 4–9):  double gaps — full variety of 2-gap shapes
 *   Phase 3 (walls 10–15): single gap — 60° window, one rotation per sector
 *                          (loops here indefinitely)
 *
 * @returns {import('./generatorInterface.js').Generator}
 */
const HARD_PHASE_START = 10;
// Pre-computed at module load — rotate() is pure, results are constant.
const TRAINING_SEQUENCE_6 = [
    // Phase 1: triple gaps (easy)
    rotate(TRIPLE_ALTERNATING, 0), // [0,1,0,1,0,1]
    rotate(TRIPLE_ADJACENT, 0), // [0,0,0,1,1,1]
    rotate(TRIPLE_ALTERNATING, 1), // [1,0,1,0,1,0]
    rotate(TRIPLE_MIXED, 0), // [0,0,1,0,1,1]
    // Phase 2: double gaps (medium) — all three shape types
    rotate(DOUBLE_ADJACENT, 0), // [0,0,1,1,1,1]
    rotate(DOUBLE_SKIP1, 0), // [0,1,0,1,1,1]
    rotate(DOUBLE_OPPOSITE, 0), // [0,1,1,0,1,1]
    rotate(DOUBLE_ADJACENT, 2), // [1,1,0,0,1,1]
    rotate(DOUBLE_SKIP1, 3), // [1,1,1,0,1,0]
    rotate(DOUBLE_OPPOSITE, 1), // [1,0,1,1,0,1]
    // Phase 3: single gap (hard) — gap steps through all 6 sectors
    rotate(SINGLE_GAP, 0), // [0,1,1,1,1,1]
    rotate(SINGLE_GAP, 1), // [1,0,1,1,1,1]
    rotate(SINGLE_GAP, 2), // [1,1,0,1,1,1]
    rotate(SINGLE_GAP, 3), // [1,1,1,0,1,1]
    rotate(SINGLE_GAP, 4), // [1,1,1,1,0,1]
    rotate(SINGLE_GAP, 5), // [1,1,1,1,1,0]
];
const TRAINING_BY_SIDE_COUNT = {
    4: {
        hardPhaseStart: 4,
        sequence: [
            rotate(PATTERNS[4].DOUBLE_ADJACENT, 0),
            rotate(PATTERNS[4].DOUBLE_OPPOSITE, 0),
            rotate(PATTERNS[4].DOUBLE_ADJACENT, 1),
            rotate(PATTERNS[4].DOUBLE_OPPOSITE, 1),
            rotate(PATTERNS[4].SINGLE_GAP, 0),
            rotate(PATTERNS[4].SINGLE_GAP, 1),
            rotate(PATTERNS[4].SINGLE_GAP, 2),
            rotate(PATTERNS[4].SINGLE_GAP, 3),
        ],
    },
    5: {
        hardPhaseStart: 6,
        sequence: [
            rotate(PATTERNS[5].TRIPLE_ADJACENT, 0),
            rotate(PATTERNS[5].TRIPLE_SPREAD, 0),
            rotate(PATTERNS[5].TRIPLE_ADJACENT, 1),
            rotate(PATTERNS[5].DOUBLE_ADJACENT, 0),
            rotate(PATTERNS[5].DOUBLE_SKIP1, 0),
            rotate(PATTERNS[5].DOUBLE_ADJACENT, 2),
            rotate(PATTERNS[5].SINGLE_GAP, 0),
            rotate(PATTERNS[5].SINGLE_GAP, 1),
            rotate(PATTERNS[5].SINGLE_GAP, 2),
            rotate(PATTERNS[5].SINGLE_GAP, 3),
            rotate(PATTERNS[5].SINGLE_GAP, 4),
        ],
    },
    6: {
        hardPhaseStart: HARD_PHASE_START,
        sequence: TRAINING_SEQUENCE_6,
    },
    8: {
        hardPhaseStart: 7,
        sequence: [
            rotate(PATTERNS[8].QUAD_ALTERNATING, 0),
            rotate(PATTERNS[8].QUAD_ADJACENT, 0),
            rotate(PATTERNS[8].TRIPLE_ADJACENT, 0),
            rotate(PATTERNS[8].TRIPLE_SPREAD, 0),
            rotate(PATTERNS[8].DOUBLE_ADJACENT, 0),
            rotate(PATTERNS[8].DOUBLE_SKIP2, 0),
            rotate(PATTERNS[8].DOUBLE_OPPOSITE, 0),
            rotate(PATTERNS[8].SINGLE_GAP, 0),
            rotate(PATTERNS[8].SINGLE_GAP, 1),
            rotate(PATTERNS[8].SINGLE_GAP, 2),
            rotate(PATTERNS[8].SINGLE_GAP, 3),
            rotate(PATTERNS[8].SINGLE_GAP, 4),
            rotate(PATTERNS[8].SINGLE_GAP, 5),
            rotate(PATTERNS[8].SINGLE_GAP, 6),
            rotate(PATTERNS[8].SINGLE_GAP, 7),
        ],
    },
};
export function createTrainingGenerator(sideCount = 6) {
    let { sequence, hardPhaseStart } = getTraining(sideCount);
    let step = 0;
    return {
        nextWall() {
            const segments = sequence[step];
            step = step + 1 >= sequence.length ? hardPhaseStart : step + 1;
            return { segments };
        },
        reset() {
            step = 0;
        },
        setSideCount(nextSideCount) {
            ({ sequence, hardPhaseStart } = getTraining(nextSideCount));
            step = 0;
        },
    };
}
function getTraining(sideCount) {
    const training = TRAINING_BY_SIDE_COUNT[sideCount];
    if (!training)
        throw new Error(`Unsupported training side count: ${sideCount}`);
    return training;
}
