import { SUPPORTED_SIDE_COUNTS } from '../layout.js';
import { ALTERNATING_CORRIDOR_SEQUENCE, FORK_AND_CONVERGE_SEQUENCE, REVEAL_PRACTICE_SEQUENCE, SPIRAL_SEQUENCE, } from './practiceSequences.js';
import { validateSequence } from './sequenceRunner.js';
const TAGS = new Set([
    'alternating', 'branching', 'choreography', 'commitment',
    'corridor', 'movement', 'reveal', 'spiral',
]);
const ENTRY_FIELDS = new Set([
    'id', 'sequence', 'supportedSideCounts', 'difficulty', 'weight', 'tags',
]);
export const SEQUENCE_CATALOGUE = Object.freeze([
    Object.freeze({
        id: 'reveal-practice',
        sequence: REVEAL_PRACTICE_SEQUENCE,
        supportedSideCounts: Object.freeze([4, 5, 6, 8]),
        difficulty: Object.freeze({ min: 0, max: 0.35 }),
        weight: 1,
        tags: Object.freeze(['reveal', 'choreography']),
    }),
    Object.freeze({
        id: 'alternating-corridor',
        sequence: ALTERNATING_CORRIDOR_SEQUENCE,
        supportedSideCounts: Object.freeze([4, 5, 6, 8]),
        difficulty: Object.freeze({ min: 0.2, max: 0.7 }),
        weight: 1,
        tags: Object.freeze(['alternating', 'corridor', 'movement']),
    }),
    Object.freeze({
        id: 'fork-and-converge',
        sequence: FORK_AND_CONVERGE_SEQUENCE,
        supportedSideCounts: Object.freeze([4, 5, 6, 8]),
        difficulty: Object.freeze({ min: 0.45, max: 1 }),
        weight: 1,
        tags: Object.freeze(['branching', 'commitment', 'movement']),
    }),
    Object.freeze({
        id: 'spiral', sequence: SPIRAL_SEQUENCE,
        supportedSideCounts: Object.freeze([4, 5, 6, 8]),
        difficulty: Object.freeze({ min: 0.15, max: 1 }),
        weight: 1, tags: Object.freeze(['spiral', 'corridor', 'movement']),
    }),
]);
export function validateSequenceCatalogue(catalogue) {
    if (!Array.isArray(catalogue) || catalogue.length === 0) {
        throw new Error('Sequence catalogue requires at least one entry.');
    }
    const ids = new Set();
    for (const entry of catalogue) {
        if (!entry || typeof entry !== 'object') {
            throw new Error('Sequence catalogue entry must be an object.');
        }
        for (const field of Object.keys(entry)) {
            if (!ENTRY_FIELDS.has(field))
                throw new Error(`Unknown sequence metadata: ${field}`);
        }
        if (typeof entry.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(entry.id)) {
            throw new Error('Sequence catalogue entry requires a kebab-case id.');
        }
        if (ids.has(entry.id))
            throw new Error(`Duplicate sequence id: ${entry.id}`);
        ids.add(entry.id);
        if (!entry.sequence || typeof entry.sequence !== 'object') {
            throw new Error(`Sequence ${entry.id} requires a definition reference.`);
        }
        if (!Array.isArray(entry.supportedSideCounts) || entry.supportedSideCounts.length === 0) {
            throw new Error(`Sequence ${entry.id} requires supported side counts.`);
        }
        const sideCounts = new Set();
        for (const sideCount of entry.supportedSideCounts) {
            if (!SUPPORTED_SIDE_COUNTS.includes(sideCount) || sideCounts.has(sideCount)) {
                throw new Error(`Sequence ${entry.id} has an unsupported or duplicate side count: ${sideCount}`);
            }
            sideCounts.add(sideCount);
            validateSequence(entry.sequence, sideCount);
        }
        if (entry.sequence.variants) {
            const variantSideCounts = Object.keys(entry.sequence.variants).map(Number);
            if (variantSideCounts.length !== sideCounts.size
                || variantSideCounts.some(sideCount => !sideCounts.has(sideCount))) {
                throw new Error(`Sequence ${entry.id} side counts must match its variants.`);
            }
        }
        const range = entry.difficulty;
        if (!range || typeof range !== 'object'
            || Object.keys(range).some(field => field !== 'min' && field !== 'max')
            || !Number.isFinite(range.min) || !Number.isFinite(range.max)
            || range.min < 0 || range.max > 1 || range.min > range.max) {
            throw new Error(`Sequence ${entry.id} has an invalid difficulty range.`);
        }
        if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
            throw new Error(`Sequence ${entry.id} requires a positive weight.`);
        }
        if (!Array.isArray(entry.tags) || entry.tags.length === 0
            || entry.tags.some((tag) => !TAGS.has(tag))
            || new Set(entry.tags).size !== entry.tags.length) {
            throw new Error(`Sequence ${entry.id} has missing, unknown, or duplicate tags.`);
        }
    }
    return catalogue;
}
validateSequenceCatalogue(SEQUENCE_CATALOGUE);
