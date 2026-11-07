import { drawHUD } from './hud.js';
import { getGeometryNotice } from '../presentation/geometryNotice.js';
import { GameMode } from '../game/GameMode.js';
import { drawDebug } from './debug.js';
import { tracePolygonCell, traceRegularPolygon } from './sectorGeometry.js';
import { getOuterWallRadius, getWallCellVertices } from '../geometry/polygonRing.js';
import { drawBackground } from './background.js';
import { drawSectorBackground } from './sectorBackground.js';
import { DEFAULT_PALETTE } from './palettes.js';
import { getMorphedWallCellVertices, getMorphedWallOpacity, getMorphSampleCount, traceMorphedRegularPolygon, } from './presentationGeometry.js';
export function render(ctx, canvas, game, debugEnabled = false, palette = DEFAULT_PALETTE, automaticPalette = false, hideStartScreen = false) {
    drawBackground(ctx, canvas, palette);
    const { geometry, layout } = game;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(game.world.rotation);
    const geometryMorph = game.presentation.geometryMorph;
    drawSectorBackground(ctx, canvas, geometry.sideCount, geometryMorph, palette);
    drawWalls(ctx, game.obstacles.walls, geometryMorph, palette);
    // The opaque center hides walls only after they have passed the player orbit.
    drawPolygon(ctx, layout.innerRadius, geometry.sideCount, geometryMorph, palette);
    drawPlayer(ctx, game.player, palette);
    ctx.restore();
    if (debugEnabled)
        drawDebug(ctx, canvas, game.player, game.obstacles.walls, game.diff, game.world.rotation, geometry, game.time, layout, geometryMorph, game.closedRevealDemo, game.sequenceRunner?.getStatus() ?? game.episodeCoordinator.getStatus().sequence);
    if (debugEnabled) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(game.world.rotation);
        drawPolygon(ctx, layout.innerRadius, geometry.sideCount, geometryMorph, palette);
        ctx.restore();
    }
    drawHUD(ctx, canvas, game.state, game.score.value, game.bestScore, game.mode, game.seed, layout, getGeometryNotice(geometry, game.presentation.geometryNotice, game.mode === GameMode.RANDOM || game.mode === GameMode.SEEDED), game.practiceLabel, palette, automaticPalette, game.diff.stage, hideStartScreen);
}
function drawPolygon(ctx, radius, sideCount, geometryMorph, palette) {
    ctx.strokeStyle = palette.centerOutline;
    ctx.fillStyle = palette.center;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (geometryMorph) {
        traceMorphedRegularPolygon(ctx, radius, geometryMorph.sourceSideCount, geometryMorph.targetSideCount, geometryMorph.progress);
    }
    else {
        traceRegularPolygon(ctx, radius, sideCount);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
function drawWalls(ctx, walls, geometryMorph, palette) {
    ctx.fillStyle = palette.wall;
    for (let wallIndex = 0; wallIndex < walls.length; wallIndex++) {
        const w = walls[wallIndex];
        const segmentCount = w.sideCount;
        const rOuter = getOuterWallRadius(w.radius, w.thickness, segmentCount);
        if (rOuter <= 0.5)
            continue;
        const wallMorph = geometryMorph?.walls[wallIndex];
        if (wallMorph) {
            drawMorphedWall(ctx, w, wallMorph, geometryMorph.progress);
            continue;
        }
        for (let i = 0; i < segmentCount; i++) {
            if (w.segments[i] === 0)
                continue;
            ctx.beginPath();
            tracePolygonCell(ctx, getWallCellVertices(w, i));
            ctx.closePath();
            ctx.fill();
        }
    }
}
function drawMorphedWall(ctx, wall, wallMorph, progress) {
    const sampleCount = getMorphSampleCount(wallMorph.sourceSideCount, wallMorph.targetSideCount);
    ctx.save();
    for (let i = 0; i < sampleCount; i++) {
        const opacity = getMorphedWallOpacity(wallMorph.sourceSegments, wallMorph.targetSegments, i, sampleCount, progress);
        if (opacity <= 0)
            continue;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        tracePolygonCell(ctx, getMorphedWallCellVertices(wall, wallMorph.sourceSideCount, wallMorph.targetSideCount, i, sampleCount, progress));
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
function drawPlayer(ctx, player, palette) {
    const x = Math.cos(player.angle) * player.radius;
    const y = Math.sin(player.angle) * player.radius;
    ctx.fillStyle = palette.player;
    ctx.beginPath();
    ctx.arc(x, y, player.size, 0, Math.PI * 2);
    ctx.fill();
}
