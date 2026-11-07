export function smoothstep01(value) {
    const t = Math.max(0, Math.min(value, 1));
    return t * t * (3 - 2 * t);
}
