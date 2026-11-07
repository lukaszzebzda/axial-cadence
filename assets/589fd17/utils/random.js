/**
 * FNV-1a 32-bit hash.
 * Produces the same unsigned 32-bit integer for the same string on every
 * platform and JS engine — uses only integer arithmetic via Math.imul.
 * @param {string} str
 * @returns {number} unsigned 32-bit integer
 */
export function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
/**
 * Mulberry32 — small, fast 32-bit PRNG with good statistical quality.
 * Returns a closure that yields floats in [0, 1).
 * Deterministic: same seed → same sequence, every time.
 * @param {number} seed  unsigned 32-bit integer
 * @returns {function(): number}
 */
export function mulberry32(seed) {
    return function () {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
