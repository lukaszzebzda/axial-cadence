// Presentation-only roles, selected by the palette/audio director.
// Choosing a palette must never consume the gameplay RNG.
export const PALETTES = Object.freeze([
    Object.freeze({
        id: 'midnight', name: 'Midnight',
        backgroundInner: '#1b3047', backgroundOuter: '#0c1424',
        sectorLight: 'rgba(255, 255, 255, 0.035)', sectorDark: 'rgba(0, 0, 0, 0.045)',
        center: '#15273a', centerOutline: '#7995b0',
        wall: '#74bccb', player: '#ffe2a8',
        text: '#edf3fa', muted: '#a0b3c8', accent: '#a6dece',
        warning: '#f2cf87', danger: '#ffa49d',
        overlay: 'rgba(8, 14, 25, 0.74)', track: '#35485e',
    }),
    Object.freeze({
        id: 'plum', name: 'Plum',
        backgroundInner: '#35273f', backgroundOuter: '#1a1225',
        sectorLight: 'rgba(255, 255, 255, 0.035)', sectorDark: 'rgba(0, 0, 0, 0.045)',
        center: '#2b2035', centerOutline: '#a38bb1',
        wall: '#b6a0cf', player: '#ffe3ac',
        text: '#f6eff8', muted: '#bdaec6', accent: '#efbdd4',
        warning: '#f2cf87', danger: '#ffaaa8',
        overlay: 'rgba(19, 12, 28, 0.74)', track: '#4c3b59',
    }),
    Object.freeze({
        id: 'petrol', name: 'Petrol',
        backgroundInner: '#173b3e', backgroundOuter: '#0b2028',
        sectorLight: 'rgba(255, 255, 255, 0.035)', sectorDark: 'rgba(0, 0, 0, 0.045)',
        center: '#123135', centerOutline: '#709c9e',
        wall: '#7cc5b4', player: '#ffd5ba',
        text: '#edf6f4', muted: '#a0bfbd', accent: '#c3dfab',
        warning: '#f2cf87', danger: '#ffaaa0',
        overlay: 'rgba(6, 22, 28, 0.74)', track: '#2d5055',
    }),
]);
export const DEFAULT_PALETTE = PALETTES[0];
export function resolvePalette(id) {
    return PALETTES.find(palette => palette.id === id) ?? DEFAULT_PALETTE;
}
