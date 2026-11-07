// Palette tokens are #rrggbb or rgba(r, g, b, a), not arbitrary CSS colors.
function parseColor(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) {
        const rgb = Number.parseInt(value.slice(1), 16);
        return { r: rgb >> 16, g: (rgb >> 8) & 255, b: rgb & 255, a: 1 };
    }
    const match = /^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/.exec(value);
    if (!match)
        throw new Error(`Unsupported palette color: ${value}`);
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: Number(match[4]) };
}
// Parse once per transition. Sampling does not create canvases or use RNG.
export function createPaletteTransition(from, to) {
    const roles = Object.keys(to).filter((role) => role !== 'id' && role !== 'name');
    const colors = roles.map(role => ({ role, from: parseColor(from[role]), to: parseColor(to[role]) }));
    return (progress) => {
        if (progress <= 0)
            return from;
        if (progress >= 1)
            return to;
        const result = { ...to };
        for (const { role, from: a, to: b } of colors) {
            const r = Math.round(a.r + (b.r - a.r) * progress);
            const g = Math.round(a.g + (b.g - a.g) * progress);
            const blue = Math.round(a.b + (b.b - a.b) * progress);
            const alpha = a.a + (b.a - a.a) * progress;
            result[role] = alpha === 1
                ? `#${[r, g, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`
                : `rgba(${r}, ${g}, ${blue}, ${alpha})`;
        }
        return result;
    };
}
