// Centralized geometry/layout model.
// All canvas-dependent sizes are derived from computeLayout().
// Call it on startup and on every canvas resize; pass the returned object
// to render, collision, and debug functions. Never hardcode px values elsewhere.
import { getPolygonSpawnRadius } from './geometry/polygonRing.js';
// FullHD (1920×1080) is the design baseline. unit = 1.0 at this resolution.
const REF_HEIGHT = 1080;
// Reference geometry at REF_HEIGHT. These document the design intent and are
// the single place to adjust base sizes.
const REF = {
    innerRadius: 110, // inner polygon (visual centre marker) radius
    playerRadius: 140, // player orbit radius
    playerSize: 6, // player dot — used for both rendering and collision
    wallThickness: 30, // default wall depth
    geometryTransitionClearance: 24, // wall clearance around the player before remapping
    wallRevealSafety: 72, // free distance between a stopped closed wall and the player
    wallRevealTriggerMargin: 20, // extra braking distance for frame and speed variation
    sequenceMinWallSeparation: 90, // minimum edge-to-edge distance at sequence spawn
    spawnMargin: 60, // clearance beyond the viewport's bounding circle
};
// Supported side counts for development/testing. Default gameplay remains hexagon.
export const DEFAULT_SIDE_COUNT = 6;
export const SUPPORTED_SIDE_COUNTS = [4, 5, 6, 8];
export function isSupportedSideCount(value) {
    return SUPPORTED_SIDE_COUNTS.includes(Number(value));
}
export function resolveSideCount(value) {
    const parsed = Number.parseInt(value, 10);
    return SUPPORTED_SIDE_COUNTS.includes(parsed) ? parsed : DEFAULT_SIDE_COUNT;
}
/**
 * Derive all canvas-dependent geometry from the current canvas dimensions.
 * Pure function — no side effects. Call on init and on every resize.
 *
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{ unit: number, innerRadius: number,
 *             playerRadius: number, playerSize: number,
 *             wallThickness: number, geometryTransitionClearance: number,
 *             wallRevealSafety: number, wallRevealTriggerMargin: number,
 *             sequenceMinWallSeparation: number,
 *             spawnRadius: number }}
 */
export function computeLayout(canvasWidth, canvasHeight) {
    // unit: 1.0 at FullHD, ~0.67 at 1280×720, ~2.0 at 4K UHD (3840×2160).
    // Derived from the short side so landscape and portrait both scale sensibly.
    const unit = Math.min(canvasWidth, canvasHeight) / REF_HEIGHT;
    // A square has the smallest inradius/circumradius ratio of supported shapes.
    // One conservative spawn boundary keeps resize progression side-count agnostic.
    const spawnRadius = getPolygonSpawnRadius(canvasWidth, canvasHeight, REF.spawnMargin * unit, 4);
    return {
        unit,
        innerRadius: REF.innerRadius * unit,
        playerRadius: REF.playerRadius * unit,
        playerSize: REF.playerSize * unit,
        wallThickness: REF.wallThickness * unit,
        geometryTransitionClearance: REF.geometryTransitionClearance * unit,
        wallRevealSafety: REF.wallRevealSafety * unit,
        wallRevealTriggerMargin: REF.wallRevealTriggerMargin * unit,
        sequenceMinWallSeparation: REF.sequenceMinWallSeparation * unit,
        spawnRadius,
    };
}
