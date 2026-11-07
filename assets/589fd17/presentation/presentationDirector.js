import { DEFAULT_PALETTE, PALETTES } from '../render/palettes.js';
import { smoothstep01 } from '../utils/easing.js';
import { createPaletteTransition } from './paletteTransition.js';
export const PALETTE_TRANSITION_SECONDS = 1.5;
// Owns presentation choices only. The simulation sends observations and never
// waits for this controller. An audio scheduler can align cues to a bar.
export function createPresentationDirector(initialPalette = DEFAULT_PALETTE, { automatic = true, scheduleCue } = {}) {
    let basePalette = initialPalette;
    let target = initialPalette;
    let current = initialPalette;
    let elapsed = PALETTE_TRANSITION_SECONDS;
    let section = 0;
    let intensityFloor = 0;
    let revision = 0;
    let queuedPalette = null;
    let sample = createPaletteTransition(initialPalette, initialPalette);
    function select(palette, animate) {
        sample = createPaletteTransition(current, palette);
        target = palette;
        elapsed = animate ? 0 : PALETTE_TRANSITION_SECONDS;
        if (!animate)
            current = palette;
    }
    function nextPalette(after = target) {
        return PALETTES[(PALETTES.indexOf(after) + 1) % PALETTES.length];
    }
    function cancelQueuedPalette() { revision++; queuedPalette = null; }
    function requestCue(intensity) {
        const palette = automatic ? nextPalette(queuedPalette ?? target) : null;
        queuedPalette = palette;
        const cueRevision = ++revision;
        const apply = () => {
            if (cueRevision !== revision || !palette || !automatic)
                return;
            queuedPalette = null;
            select(palette, true);
        };
        if (!scheduleCue?.(intensity, apply))
            apply();
    }
    return {
        get palette() { return current; },
        get automatic() { return automatic; },
        handleEvent(event) {
            switch (event.type) {
                case 'run-started':
                    cancelQueuedPalette();
                    section = 0;
                    intensityFloor = 0;
                    select(basePalette, false);
                    break;
                case 'geometry-applied':
                    section = (section + 1) % 3;
                    requestCue(Math.max(intensityFloor, [0, 0.55, 1][section]));
                    break;
                case 'difficulty-stage-changed':
                    intensityFloor = event.stage === 2 ? 0.75 : 0;
                    requestCue(event.stage === 2 ? 1 : 0);
                    break;
                case 'presentation-advanced':
                    if (!Number.isFinite(event.seconds) || event.seconds < 0) {
                        throw new Error(`Invalid presentation time: ${event.seconds}`);
                    }
                    if (event.seconds === 0 || elapsed >= PALETTE_TRANSITION_SECONDS)
                        break;
                    elapsed = Math.min(PALETTE_TRANSITION_SECONDS, elapsed + event.seconds);
                    if (elapsed + 1e-9 >= PALETTE_TRANSITION_SECONDS)
                        elapsed = PALETTE_TRANSITION_SECONDS;
                    current = sample(smoothstep01(elapsed / PALETTE_TRANSITION_SECONDS));
                    break;
            }
        },
        selectNextPalette(animate = true) {
            cancelQueuedPalette();
            automatic = false;
            basePalette = nextPalette();
            select(basePalette, animate);
        },
        toggleAutomatic() {
            cancelQueuedPalette();
            automatic = !automatic;
            if (!automatic)
                basePalette = target;
        },
    };
}
