import { TAU } from '../utils/math.js';
import { getOuterWallRadius, getPolygonRadiusAtAngle, } from '../geometry/polygonRing.js';
export { getPolygonRadiusAtAngle as getRegularPolygonRadiusAtAngle } from '../geometry/polygonRing.js';
export function getMorphSampleCount(sourceSideCount, targetSideCount) {
    return leastCommonMultiple(sourceSideCount, targetSideCount);
}
export function getMorphedPolygonRadius(radius, sourceSideCount, targetSideCount, angle, progress) {
    const sourceRadius = getPolygonRadiusAtAngle(radius, sourceSideCount, angle);
    const targetRadius = getPolygonRadiusAtAngle(radius, targetSideCount, angle);
    return sourceRadius + (targetRadius - sourceRadius) * progress;
}
export function getMorphedWallCellVertices(wall, sourceSideCount, targetSideCount, sampleIndex, sampleCount, progress) {
    const start = sampleIndex * TAU / sampleCount;
    const end = (sampleIndex + 1) * TAU / sampleCount;
    const inner = Math.max(0, wall.radius);
    const sourceOuter = Math.max(inner, getOuterWallRadius(wall.radius, wall.thickness, sourceSideCount));
    const targetOuter = Math.max(inner, getOuterWallRadius(wall.radius, wall.thickness, targetSideCount));
    function point(angle, sourceRadius, targetRadius) {
        const source = getPolygonRadiusAtAngle(sourceRadius, sourceSideCount, angle);
        const target = getPolygonRadiusAtAngle(targetRadius, targetSideCount, angle);
        const distance = source + (target - source) * progress;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
    }
    return [
        point(start, sourceOuter, targetOuter),
        point(end, sourceOuter, targetOuter),
        point(end, inner, inner),
        point(start, inner, inner),
    ];
}
export function traceMorphedRegularPolygon(ctx, radius, sourceSideCount, targetSideCount, progress) {
    const sampleCount = getMorphSampleCount(sourceSideCount, targetSideCount);
    for (let i = 0; i < sampleCount; i++) {
        const angle = i * TAU / sampleCount;
        const sampleRadius = getMorphedPolygonRadius(radius, sourceSideCount, targetSideCount, angle, progress);
        const x = Math.cos(angle) * sampleRadius;
        const y = Math.sin(angle) * sampleRadius;
        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
}
export function getMorphedWallOpacity(sourceSegments, targetSegments, sampleIndex, sampleCount, progress) {
    const sourceIndex = Math.floor(sampleIndex * sourceSegments.length / sampleCount);
    const targetIndex = Math.floor(sampleIndex * targetSegments.length / sampleCount);
    const source = sourceSegments[sourceIndex];
    const target = targetSegments[targetIndex];
    return source + (target - source) * progress;
}
function leastCommonMultiple(a, b) {
    return Math.abs(a * b) / greatestCommonDivisor(a, b);
}
function greatestCommonDivisor(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
        const remainder = x % y;
        x = y;
        y = remainder;
    }
    return x;
}
