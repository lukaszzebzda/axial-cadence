import { TAU } from '../utils/math.js';
// Called in the same rotated frame as the walls. These are background tints,
// never geometry or colliders. The radial gradient underneath stays intact.
export function drawSectorBackground(ctx, canvas, sideCount, morph, palette) {
    const radius = Math.hypot(canvas.width, canvas.height) / 2 + 1;
    ctx.save();
    if (morph) {
        drawSectors(morph.sourceSideCount, 1 - morph.progress);
        drawSectors(morph.targetSideCount, morph.progress);
    }
    else
        drawSectors(sideCount, 1);
    ctx.restore();
    function drawSectors(sides, opacity) {
        if (opacity <= 0)
            return;
        ctx.globalAlpha = opacity;
        for (let sector = 0; sector < sides; sector++) {
            // An odd polygon cannot alternate two colors at every shared boundary.
            // Leave the last sector neutral so the seam has a third, subtle shade.
            if (sides % 2 === 1 && sector === sides - 1)
                continue;
            const start = sector * TAU / sides;
            const end = (sector + 1) * TAU / sides;
            ctx.fillStyle = sector % 2 === 0 ? palette.sectorLight : palette.sectorDark;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
            ctx.arc(0, 0, radius, start, end);
            ctx.closePath();
            ctx.fill();
        }
    }
}
