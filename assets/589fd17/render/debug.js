import { normAngle, TAU } from '../utils/math.js';
import { circleIntersectsConvexPolygon, getWallCellVertices, } from '../geometry/polygonRing.js';
import { getWallLifecycleDuration } from '../entities/wallChoreography.js';
import { getSectorAngles, getSectorStep, tracePolygonCell, traceRegularPolygon, } from './sectorGeometry.js';
/**
 * Collision debug overlay.
 * Called only when the browser adapter enables debug rendering.
 *
 * World-space visuals are drawn in their own save/translate/rotate/restore block
 * so this function is safe to call after the main ctx.restore().
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {object}   player         player entity
 * @param {object[]} walls          current obstacle walls
 * @param {{ t: number } | null} diff  difficulty state (may be null before first run)
 * @param {number}   worldRotation  current world rotation in radians
 * @param {object}   geometry       authoritative geometry and transition state
 * @param {object}   time           simulation timing state
 * @param {object}   layout         current layout from computeLayout()
 * @param {object|null} geometryMorph presentation-only geometry morph
 * @param {boolean} closedRevealDemo isolated wall choreography debug activation
 * @param {object|null} sequenceStatus authored sequence execution diagnostics
 */
export function drawDebug(ctx, canvas, player, walls, diff, worldRotation, geometry, time, layout, geometryMorph, closedRevealDemo, sequenceStatus) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    _drawWorldOverlay(ctx, cx, cy, player, walls, worldRotation, geometry.sideCount, layout);
    _drawTextPanel(ctx, canvas, player, walls, diff, geometry, time, layout, geometryMorph, closedRevealDemo, sequenceStatus);
}
// ─── world-space overlay ──────────────────────────────────────────────────────
function _drawWorldOverlay(ctx, cx, cy, player, walls, worldRotation, sideCount, layout) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(worldRotation);
    _drawSectorGrid(ctx, layout, sideCount);
    const playerCenter = {
        x: Math.cos(player.angle) * player.radius,
        y: Math.sin(player.angle) * player.radius,
    };
    for (const w of walls)
        _drawWallDebug(ctx, w, playerCenter, player.size);
    _drawPlayerCollisionCircle(ctx, playerCenter, player.size);
    ctx.restore();
}
function _drawSectorGrid(ctx, layout, sideCount) {
    // Lines extend to the spawn boundary so the full active gameplay area is visible.
    const reach = layout.spawnRadius;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1;
    for (let i = 0; i < sideCount; i++) {
        const { start } = getSectorAngles(i, sideCount);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(start) * reach, Math.sin(start) * reach);
        ctx.stroke();
    }
}
function _drawWallDebug(ctx, w, playerCenter, playerSize) {
    const segmentCount = w.sideCount;
    // Cell outlines and hit highlighting use the exact collision quadrilaterals.
    for (let i = 0; i < segmentCount; i++) {
        const vertices = getWallCellVertices(w, i);
        const blocked = w.segments[i] === 1;
        const hit = blocked && circleIntersectsConvexPolygon(playerCenter, playerSize, vertices);
        ctx.fillStyle = hit ? 'rgba(255, 40, 40, 0.55)'
            : blocked ? 'rgba(255, 60, 60, 0.20)'
                : 'rgba(60, 255, 120, 0.14)';
        ctx.strokeStyle = hit ? '#ff4040' : 'rgba(0, 220, 255, 0.55)';
        ctx.lineWidth = hit ? 2 : 1;
        ctx.beginPath();
        tracePolygonCell(ctx, vertices);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    const event = w.choreography;
    if (event && !event.revealed) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1;
        for (const [radius, color] of [
            [event.stopRadius, '#ffbb55'],
            [event.triggerRadius, '#55bbff'],
        ]) {
            if (radius === null)
                continue;
            ctx.strokeStyle = color;
            ctx.beginPath();
            traceRegularPolygon(ctx, radius, w.sideCount);
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }
}
function _drawPlayerCollisionCircle(ctx, center, radius) {
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, TAU);
    ctx.stroke();
}
// ─── text panel ───────────────────────────────────────────────────────────────
function _drawTextPanel(ctx, canvas, player, walls, diff, geometry, time, layout, geometryMorph, closedRevealDemo, sequenceStatus) {
    const center = normAngle(player.angle);
    const sectorStep = getSectorStep(geometry.sideCount);
    const sector = Math.floor(center / sectorStep);
    const transition = geometry.transition;
    const playerCenter = {
        x: Math.cos(player.angle) * player.radius,
        y: Math.sin(player.angle) * player.radius,
    };
    const hitCells = walls.reduce((total, wall) => {
        for (let i = 0; i < wall.sideCount; i++) {
            if (wall.segments[i] === 1 && circleIntersectsConvexPolygon(playerCenter, player.size, getWallCellVertices(wall, i)))
                total++;
        }
        return total;
    }, 0);
    const mismatchedWalls = walls.filter(w => w.sideCount !== geometry.sideCount || w.segments.length !== w.sideCount).length;
    const wallSideCounts = [...new Set(walls.map(w => w.sideCount))].join(', ') || '-';
    const choreographedWall = walls.find(wall => wall.choreography);
    const rows = [
        ['sides ', `${geometry.sideCount}`],
        ['target', `${transition.targetSideCount ?? '-'}`],
        ['visual', geometryMorph
                ? `${geometryMorph.sourceSideCount} -> ${geometryMorph.targetSideCount}`
                : `${geometry.sideCount}`],
        ['morph ', geometryMorph
                ? `${Math.round(geometryMorph.progress * 100)}%`
                : '-'],
        ['applied', geometryMorph ? `${geometryMorph.applied}` : '-'],
        ['state ', transition.state],
        ['auto  ', `${transition.scheduleElapsed.toFixed(1)} / ${transition.config.interval}s`],
        ['sched ', `${Math.round(transition.scheduleProgress * 100)}%`],
        ['warn  ', `${Math.round(transition.warningProgress * 100)}%`],
        ['slow  ', `${Math.round(transition.slowdownProgress * 100)}%`],
        ['freeze', `${Math.round(transition.freezeProgress * 100)}%`],
        ['recover', `${Math.round(transition.recoveryProgress * 100)}%`],
        ['progress', `${Math.round(transition.transitionProgress * 100)}%`],
        ['walls x', time.simulationScale.toFixed(2)],
        ['rotation x', '1.00'],
        ['player x', `${time.playerScale.toFixed(2)} ${time.playerIndependent ? 'independent' : 'scaled'}`],
        ['walls ', `${walls.length} (${wallSideCounts})`],
        ['mismatch', `${mismatchedWalls}`],
        ['keys  ', '4 / 5 / 6 / 8'],
        ['angle ', `${center.toFixed(3)} rad`],
        ['sector', `${sector}`],
        ['step  ', `${sectorStep.toFixed(4)} rad`],
        ['hit cells', `${hitCells}`],
    ];
    if (diff)
        rows.push(['diff t', diff.t.toFixed(3)]);
    if (closedRevealDemo) {
        rows.push(['reveal demo', 'on']);
    }
    if (choreographedWall) {
        const event = choreographedWall.choreography;
        const duration = getWallLifecycleDuration(event.state);
        rows.push(['wall state', event.state], ['wall x', event.movementScale.toFixed(2)], ['wall r', choreographedWall.radius.toFixed(1)], ['stop / safe', `${event.stopRadius.toFixed(1)} / ${layout.wallRevealSafety.toFixed(1)}`], ['trigger', event.triggerRadius?.toFixed(1) ?? '-'], ['pattern', choreographedWall.segments.join('')], ['revealed', `${event.revealed}`], ['wall time', duration === null ? '-'
                : `${event.elapsed.toFixed(2)} / ${duration.toFixed(2)}s`]);
    }
    if (sequenceStatus) {
        rows.push(['sequence', sequenceStatus.name], ['seq variant', sequenceStatus.variantSideCount === null
                ? 'shared'
                : `${sequenceStatus.variantSideCount} sides`], ['seq next', sequenceStatus.completed
                ? '-'
                : `${Math.min(sequenceStatus.entryIndex + 1, sequenceStatus.entryCount)} / ${sequenceStatus.entryCount}`], ['seq cycle', `${sequenceStatus.cycle}`], ['seq gap', `${sequenceStatus.spacingRemaining.toFixed(2)}s`], ['seq choreo', sequenceStatus.waitingForChoreography ? 'waiting' : 'clear'], ['seq spacing', sequenceStatus.waitingForClearance ? 'waiting' : 'clear'], ['seq done', `${sequenceStatus.completed}`]);
    }
    const s = layout.unit;
    const lineH = Math.round(18 * s);
    const colW = Math.round(86 * s);
    const panelW = Math.round(255 * s);
    const x = canvas.width - panelW - Math.round(16 * s);
    let y = Math.round(28 * s);
    ctx.font = `${Math.round(13 * s)}px monospace`;
    ctx.textAlign = 'left';
    for (const [label, value] of rows) {
        // Background strip.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.fillRect(x - 3, y - Math.round(13 * s), panelW, lineH);
        ctx.fillStyle = '#999';
        ctx.fillText(`${label}:`, x, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(value, x + colW, y);
        y += lineH;
    }
}
