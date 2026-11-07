import { validateSequenceCatalogue } from './sequenceCatalogue.js';
export function getSequenceEligibility({ catalogue, sideCount, difficulty }) {
    validateSequenceCatalogue(catalogue);
    if (!Number.isInteger(sideCount))
        throw new Error('Sequence selection requires an integer side count.');
    if (!Number.isFinite(difficulty) || difficulty < 0 || difficulty > 1) {
        throw new Error('Sequence selection requires difficulty in [0, 1].');
    }
    return catalogue.map(entry => {
        const reasons = [];
        if (!entry.supportedSideCounts.includes(sideCount))
            reasons.push('unsupported side count');
        if (difficulty < entry.difficulty.min)
            reasons.push('below minimum difficulty');
        if (difficulty > entry.difficulty.max)
            reasons.push('above maximum difficulty');
        return { entry, reasons };
    });
}
export function selectSequence({ catalogue, sideCount, difficulty, rng, previousSequenceId = null }) {
    if (typeof rng !== 'function')
        throw new Error('Sequence selection requires an injected RNG.');
    const eligible = getSequenceEligibility({ catalogue, sideCount, difficulty })
        .filter(result => result.reasons.length === 0)
        .map(result => result.entry);
    if (eligible.length === 0)
        return null;
    const candidates = eligible.length > 1
        ? eligible.filter(entry => entry.id !== previousSequenceId)
        : eligible;
    const pool = candidates.length > 0 ? candidates : eligible;
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    if (!Number.isFinite(totalWeight)) {
        throw new Error('Sequence selection weights exceed the numeric range.');
    }
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new Error(`Sequence RNG must return a value in [0, 1): ${value}`);
    }
    let threshold = value * totalWeight;
    for (const entry of pool) {
        threshold -= entry.weight;
        if (threshold < 0)
            return entry;
    }
    return pool.at(-1);
}
