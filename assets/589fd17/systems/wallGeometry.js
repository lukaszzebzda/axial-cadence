import { TAU } from '../utils/math.js';
import { createWall, validateWallSegments } from '../entities/wall.js';
import { getCanonicalPatterns, rotate } from '../generators/patterns.js';
import { isSupportedSideCount } from '../layout.js';
import { getOuterWallRadius } from '../geometry/polygonRing.js';
const SCORE_EPSILON = 1e-9;
export function remapWallGeometry(wall, targetSideCount) {
    if (!isSupportedSideCount(targetSideCount)) {
        throw new Error(`Unsupported wall geometry side count: ${targetSideCount}`);
    }
    validateWallSegments(wall.segments, wall.sideCount);
    const hasGap = wall.segments.includes(0);
    if (wall.sideCount === targetSideCount) {
        return createWall(wall, targetSideCount, { requireGap: hasGap });
    }
    let segments;
    if (wall.segments.every(value => value === 0)) {
        segments = Array(targetSideCount).fill(0);
    }
    else if (!hasGap) {
        // Closed walls are only retained when the source was explicitly closed.
        segments = Array(targetSideCount).fill(1);
    }
    else {
        segments = findClosestCanonicalPattern(wall.segments, targetSideCount);
    }
    return createWall({ ...wall, segments }, targetSideCount, { requireGap: hasGap });
}
export function remapWallsGeometry(walls, targetSideCount) {
    return walls.map(wall => remapWallGeometry(wall, targetSideCount));
}
export function hasGeometryTransitionClearance(walls, playerRadius, clearance, expectedInwardTravel = 0, targetSideCount) {
    return walls.every(wall => {
        const predictedInner = wall.radius - expectedInwardTravel;
        const target = targetSideCount ?? wall.sideCount;
        const predictedOuter = Math.max(getOuterWallRadius(predictedInner, wall.thickness, wall.sideCount), getOuterWallRadius(predictedInner, wall.thickness, target));
        const predictedInnerFace = Math.min(predictedInner * Math.cos(Math.PI / wall.sideCount), predictedInner * Math.cos(Math.PI / target));
        return predictedInnerFace >= playerRadius + clearance
            || predictedOuter <= playerRadius - clearance;
    });
}
function findClosestCanonicalPattern(sourceSegments, targetSideCount) {
    const sourceGapMeasure = getGapMeasure(sourceSegments);
    let best = null;
    for (const canonical of getCanonicalPatterns(targetSideCount)) {
        validateWallSegments(canonical, targetSideCount, { requireGap: true });
        for (let offset = 0; offset < targetSideCount; offset++) {
            const candidate = rotate(canonical, offset);
            const overlap = getGapOverlap(sourceSegments, candidate);
            const targetGapMeasure = getGapMeasure(candidate);
            const union = sourceGapMeasure + targetGapMeasure - overlap;
            const similarity = union === 0 ? 1 : overlap / union;
            const centerDistance = getAverageGapCenterDistance(sourceSegments, candidate);
            if (best === null ||
                similarity > best.similarity + SCORE_EPSILON ||
                (Math.abs(similarity - best.similarity) <= SCORE_EPSILON &&
                    centerDistance < best.centerDistance - SCORE_EPSILON)) {
                best = { segments: candidate, similarity, centerDistance };
            }
        }
    }
    if (!best) {
        throw new Error(`Cannot remap wall to unsupported side count ${targetSideCount}.`);
    }
    return best.segments;
}
function getGapMeasure(segments) {
    return segments.filter(value => value === 0).length * (TAU / segments.length);
}
function getGapOverlap(source, target) {
    const sourceStep = TAU / source.length;
    const targetStep = TAU / target.length;
    let overlap = 0;
    for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex++) {
        if (source[sourceIndex] !== 0)
            continue;
        const sourceStart = sourceIndex * sourceStep;
        const sourceEnd = sourceStart + sourceStep;
        for (let targetIndex = 0; targetIndex < target.length; targetIndex++) {
            if (target[targetIndex] !== 0)
                continue;
            const targetStart = targetIndex * targetStep;
            const targetEnd = targetStart + targetStep;
            overlap += Math.max(0, Math.min(sourceEnd, targetEnd) - Math.max(sourceStart, targetStart));
        }
    }
    return overlap;
}
function getAverageGapCenterDistance(source, target) {
    const sourceCenters = getGapCenters(source);
    const targetCenters = getGapCenters(target);
    let total = 0;
    for (const sourceCenter of sourceCenters) {
        let nearest = Infinity;
        for (const targetCenter of targetCenters) {
            const direct = Math.abs(sourceCenter - targetCenter);
            nearest = Math.min(nearest, direct, TAU - direct);
        }
        total += nearest;
    }
    return total / sourceCenters.length;
}
function getGapCenters(segments) {
    const step = TAU / segments.length;
    const centers = [];
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === 0)
            centers.push((i + 0.5) * step);
    }
    return centers;
}
