// Cache per context, so separate canvases cannot share size-dependent resources.
const backgrounds = new WeakMap();
export function drawBackground(ctx, canvas, palette) {
    let cached = backgrounds.get(ctx);
    if (!cached || cached.width !== canvas.width || cached.height !== canvas.height
        || cached.inner !== palette.backgroundInner || cached.outer !== palette.backgroundOuter) {
        const radius = Math.max(1, Math.hypot(canvas.width, canvas.height) / 2);
        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, radius);
        gradient.addColorStop(0, palette.backgroundInner);
        gradient.addColorStop(1, palette.backgroundOuter);
        cached = { width: canvas.width, height: canvas.height,
            inner: palette.backgroundInner, outer: palette.backgroundOuter, gradient };
        backgrounds.set(ctx, cached);
    }
    // Opaque paint replaces clearing and never leaves trails behind moving walls.
    ctx.fillStyle = cached.gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
