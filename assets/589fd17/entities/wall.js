import { getOuterWallRadius } from '../geometry/polygonRing.js';
export function moveWall(wall, speed, dt) {
    wall.radius -= speed * dt;
}
export function isWallDead(wall) {
    return getOuterWallRadius(wall.radius, wall.thickness, wall.sideCount) <= 0.5;
}
export function remapWallLayout(wall, previousLayout, nextLayout) {
    const previousTravel = previousLayout.spawnRadius - previousLayout.playerRadius;
    const nextTravel = nextLayout.spawnRadius - nextLayout.playerRadius;
    if (previousTravel <= 0 || nextTravel <= 0) {
        throw new Error('Wall layout requires spawnRadius outside playerRadius.');
    }
    // Preserve progress along the spawn-to-player path when viewport aspect ratio changes.
    const progress = (previousLayout.spawnRadius - wall.radius) / previousTravel;
    wall.radius = nextLayout.spawnRadius - progress * nextTravel;
    wall.thickness *= nextLayout.unit / previousLayout.unit;
}
export function createWall(wall, sideCount, { requireGap = true } = {}) {
    validateWallSegments(wall.segments, sideCount, { requireGap });
    return {
        ...wall,
        sideCount,
        segments: wall.segments.slice(),
    };
}
export function validateWallSegments(segments, sideCount, { requireGap = false } = {}) {
    if (!Array.isArray(segments)) {
        throw new Error('Wall segments must be an array.');
    }
    if (segments.length !== sideCount) {
        throw new Error(`Wall has ${segments.length} segments, expected ${sideCount}.`);
    }
    if (segments.some(value => value !== 0 && value !== 1)) {
        throw new Error('Wall segments may contain only 0 (gap) or 1 (solid).');
    }
    if (requireGap && !segments.includes(0)) {
        throw new Error('Wall must contain at least one traversable gap.');
    }
    return segments;
}
