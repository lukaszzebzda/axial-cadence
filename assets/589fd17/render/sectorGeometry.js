import { TAU } from '../utils/math.js';
import { getPolygonVertex } from '../geometry/polygonRing.js';
export function getSectorStep(sideCount) {
    return TAU / sideCount;
}
export function getSectorAngles(index, sideCount) {
    const step = getSectorStep(sideCount);
    const start = index * step;
    return {
        start,
        end: start + step,
    };
}
export function traceRegularPolygon(ctx, radius, sideCount) {
    for (let i = 0; i < sideCount; i++) {
        const point = getPolygonVertex(radius, sideCount, i);
        if (i === 0)
            ctx.moveTo(point.x, point.y);
        else
            ctx.lineTo(point.x, point.y);
    }
}
export function tracePolygonCell(ctx, vertices) {
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
}
