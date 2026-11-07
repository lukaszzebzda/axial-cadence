import { TAU } from '../utils/math.js';
// Wall radius is the inner polygon circumradius. Thickness is the perpendicular
// distance between corresponding inner and outer edges (polygon inradii).
export function getOuterWallRadius(radius, thickness, sideCount) {
    return radius + thickness / Math.cos(Math.PI / sideCount);
}
export function getPolygonVertex(radius, sideCount, index, rotation = 0) {
    const angle = index * TAU / sideCount + rotation;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
export function getPolygonVertices(radius, sideCount, rotation = 0) {
    return Array.from({ length: sideCount }, (_, index) => getPolygonVertex(radius, sideCount, index, rotation));
}
export function getPolygonRadiusAtAngle(radius, sideCount, angle) {
    const step = TAU / sideCount;
    const sector = Math.floor(angle / step);
    const sideNormal = (sector + 0.5) * step;
    return radius * Math.cos(step / 2) / Math.cos(angle - sideNormal);
}
export function getWallCellVertices(wall, index, rotation = 0) {
    const inner = Math.max(0, wall.radius);
    const outer = Math.max(inner, getOuterWallRadius(wall.radius, wall.thickness, wall.sideCount));
    return [
        getPolygonVertex(outer, wall.sideCount, index, rotation),
        getPolygonVertex(outer, wall.sideCount, index + 1, rotation),
        getPolygonVertex(inner, wall.sideCount, index + 1, rotation),
        getPolygonVertex(inner, wall.sideCount, index, rotation),
    ];
}
export function circleIntersectsConvexPolygon(center, radius, vertices) {
    let hasPositiveSide = false;
    let hasNegativeSide = false;
    let closestSquared = Infinity;
    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const px = center.x - a.x;
        const py = center.y - a.y;
        const side = dx * py - dy * px;
        if (side > 1e-9)
            hasPositiveSide = true;
        if (side < -1e-9)
            hasNegativeSide = true;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
        const nearestX = a.x + t * dx;
        const nearestY = a.y + t * dy;
        const distanceSquared = (center.x - nearestX) ** 2 + (center.y - nearestY) ** 2;
        closestSquared = Math.min(closestSquared, distanceSquared);
    }
    const inside = hasPositiveSide !== hasNegativeSide;
    return inside || closestSquared <= radius * radius + 1e-9;
}
export function getPolygonSpawnRadius(canvasWidth, canvasHeight, margin, sideCount) {
    // The inner polygon must contain the viewport for every world rotation.
    return (Math.hypot(canvasWidth, canvasHeight) / 2 + margin)
        / Math.cos(Math.PI / sideCount);
}
