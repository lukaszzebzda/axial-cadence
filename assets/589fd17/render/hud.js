import { GameState } from '../game/GameState.js';
import { GameMode } from '../game/GameMode.js';
import { DEFAULT_PALETTE } from './palettes.js';
import { GAME_TITLE } from '../game/identity.js';
export function drawHUD(ctx, canvas, gameState, score, bestScore, mode, seed, layout, geometryNotice, practiceLabel = 'Standard', palette = DEFAULT_PALETTE, automaticPalette = false, difficultyStage = 1, hideStartScreen = false) {
    switch (gameState) {
        case GameState.START:
            if (!hideStartScreen)
                _drawStart(ctx, canvas, bestScore, mode, seed, layout, practiceLabel, palette);
            break;
        case GameState.RUNNING:
            _drawRunning(ctx, score, bestScore, mode, seed, layout, practiceLabel, palette, difficultyStage);
            break;
        case GameState.PAUSED:
            _drawRunning(ctx, score, bestScore, mode, seed, layout, practiceLabel, palette, difficultyStage);
            _drawPaused(ctx, canvas, layout, palette);
            break;
        case GameState.GAME_OVER:
            _drawGameOver(ctx, canvas, score, bestScore, mode, seed, layout, palette);
            break;
    }
    if (geometryNotice && (gameState === GameState.RUNNING || gameState === GameState.PAUSED)) {
        _drawGeometryWarning(ctx, canvas, geometryNotice, layout, palette);
    }
    // Keep the palette hint readable when an offscreen wall crosses this corner.
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(canvas.width - Math.round(250 * layout.unit), canvas.height - Math.round(60 * layout.unit), Math.round(240 * layout.unit), Math.round(50 * layout.unit));
    ctx.textAlign = 'right';
    ctx.font = `${Math.round(12 * layout.unit)}px monospace`;
    ctx.fillStyle = palette.muted;
    const right = canvas.width - Math.round(20 * layout.unit);
    ctx.fillText(`${palette.name} · ${automaticPalette ? 'AUTO' : 'MANUAL'}`, right, canvas.height - Math.round(36 * layout.unit));
    ctx.fillText(`P palette · O ${automaticPalette ? 'lock' : 'auto'}`, right, canvas.height - Math.round(20 * layout.unit));
}
// ─── per-state draws ──────────────────────────────────────────────────────────
function _drawStart(ctx, canvas, bestScore, mode, seed, layout, practiceLabel, palette) {
    _dim(ctx, canvas, palette);
    const lines = [
        { text: GAME_TITLE, size: 36, color: palette.accent },
        { text: '', size: 20 },
        { text: `[ ${mode} ]`, size: 22 },
    ];
    if (mode === GameMode.SEEDED) {
        lines.push({ text: seed, size: 14, color: palette.muted });
    }
    if (mode === GameMode.TRAINING) {
        lines.push({ text: `Exercise: ${practiceLabel}`, size: 17 });
        lines.push({ text: '↑  ↓  choose exercise', size: 13, color: palette.muted });
    }
    lines.push({ text: '', size: 10 });
    lines.push({ text: '←  →  change mode', size: 13, color: palette.muted });
    lines.push({ text: '', size: 10 });
    if (bestScore > 0) {
        lines.push({ text: `Best: ${bestScore.toFixed(2)}s`, size: 16 });
    }
    lines.push({ text: 'SPACE  start', size: 16 });
    _block(ctx, canvas.width / 2, canvas.height / 2 - Math.round(90 * layout.unit), lines, palette, layout.unit);
}
function _drawRunning(ctx, score, bestScore, mode, seed, layout, practiceLabel, palette, difficultyStage) {
    const s = layout.unit;
    const margin = Math.round(20 * s);
    const baseY = Math.round(80 * s);
    const lineH = Math.round(20 * s);
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(margin - Math.round(10 * s), baseY - Math.round(24 * s), Math.round(270 * s), Math.round(((mode === GameMode.RANDOM ? 54 : 74) + (difficultyStage === 2 ? 20 : 0)) * s));
    ctx.fillStyle = palette.text;
    ctx.font = `${Math.round(16 * s)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score.toFixed(2)}s`, margin, baseY);
    ctx.fillText(`Best:  ${bestScore.toFixed(2)}s`, margin, baseY + lineH);
    if (mode === GameMode.SEEDED) {
        ctx.fillStyle = palette.muted;
        ctx.font = `${Math.round(13 * s)}px monospace`;
        ctx.fillText(`Seed: ${seed}`, margin, baseY + lineH * 2);
    }
    else if (mode === GameMode.TRAINING) {
        ctx.fillStyle = palette.muted;
        ctx.font = `${Math.round(13 * s)}px monospace`;
        ctx.fillText(`TRAINING: ${practiceLabel}`, margin, baseY + lineH * 2);
    }
    if (difficultyStage === 2) {
        ctx.fillStyle = palette.accent;
        ctx.font = `${Math.round(13 * s)}px monospace`;
        ctx.fillText('CADENCE II', margin, baseY + lineH * (mode === GameMode.RANDOM ? 2 : 3));
    }
}
function _drawPaused(ctx, canvas, layout, palette) {
    _dim(ctx, canvas, palette);
    _block(ctx, canvas.width / 2, canvas.height / 2 - Math.round(30 * layout.unit), [
        { text: 'PAUSED', size: 28 },
        { text: '', size: 10 },
        { text: 'ESC or SPACE  to resume', size: 16 },
    ], palette, layout.unit);
}
function _drawGameOver(ctx, canvas, score, bestScore, mode, seed, layout, palette) {
    const isNewBest = score > 0 && score >= bestScore;
    _dim(ctx, canvas, palette);
    const lines = [
        { text: 'HIT!', size: 36, color: palette.danger },
        { text: '', size: 6 },
        { text: `${score.toFixed(2)}s`, size: 24 },
        { text: isNewBest ? 'NEW BEST!' : `Best: ${bestScore.toFixed(2)}s`, size: 16,
            color: isNewBest ? palette.accent : palette.text },
        { text: '', size: 10 },
        { text: 'SPACE  to restart', size: 16 },
        { text: 'ESC  menu', size: 14 },
    ];
    if (mode === GameMode.SEEDED) {
        lines.push({ text: '', size: 8 });
        lines.push({ text: `Seed: ${seed}`, size: 13, color: palette.muted });
    }
    else if (mode === GameMode.TRAINING) {
        lines.push({ text: '', size: 8 });
        lines.push({ text: 'TRAINING', size: 13, color: palette.muted });
    }
    _block(ctx, canvas.width / 2, canvas.height / 2 - Math.round(80 * layout.unit), lines, palette, layout.unit);
}
function _drawGeometryWarning(ctx, canvas, notice, layout, palette) {
    const s = layout.unit;
    const width = Math.round(220 * s);
    const height = Math.max(3, Math.round(4 * s));
    const x = Math.round((canvas.width - width) / 2);
    const y = Math.round(42 * s);
    ctx.save();
    ctx.globalAlpha = notice.opacity;
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(x - Math.round(30 * s), y - Math.round(24 * s), width + Math.round(60 * s), Math.round((notice.waiting ? 70 : 48) * s));
    ctx.textAlign = 'center';
    ctx.font = `${Math.round(15 * s)}px monospace`;
    const color = notice.confirmed ? palette.accent : palette.warning;
    ctx.fillStyle = color;
    ctx.fillText(notice.label, canvas.width / 2, y);
    ctx.fillStyle = palette.track;
    ctx.fillRect(x, y + Math.round(10 * s), width, height);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + Math.round(10 * s), width * notice.progress, height);
    if (notice.waiting) {
        ctx.font = `${Math.round(12 * s)}px monospace`;
        ctx.fillText('Waiting for walls / active phrase', canvas.width / 2, y + Math.round(34 * s));
    }
    ctx.restore();
}
// ─── helpers ─────────────────────────────────────────────────────────────────
function _dim(ctx, canvas, palette) {
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
// Renders a vertical stack of text lines centred at (cx, startY).
// Each line: { text, size, color? }. Empty text acts as a spacer using size px.
// scale multiplies all font sizes and spacer heights.
function _block(ctx, cx, startY, lines, palette, scale = 1) {
    let y = startY;
    for (const { text, size, color = palette.text } of lines) {
        const sz = Math.round(size * scale);
        if (!text) {
            y += sz;
            continue;
        }
        ctx.font = `${sz}px monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, cx, y);
        y += Math.round(sz * 1.6);
    }
}
