import { circleIntersectsConvexPolygon, getWallCellVertices, } from '../geometry/polygonRing.js';
// Pure function — no side effects. Consistent with the rotated world render frame:
// player.angle is used directly because the player is drawn inside the rotated context.
export function checkCollision(player, walls) {
    const center = {
        x: Math.cos(player.angle) * player.radius,
        y: Math.sin(player.angle) * player.radius,
    };
    for (const w of walls) {
        for (let i = 0; i < w.sideCount; i++) {
            if (w.segments[i] === 0)
                continue;
            if (circleIntersectsConvexPolygon(center, player.size, getWallCellVertices(w, i))) {
                return true;
            }
        }
    }
    return false;
}
