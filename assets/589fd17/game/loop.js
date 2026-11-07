export function startLoop(game, ctx, canvas) {
    let lastTime = null;
    function tick(time) {
        // Skip the first frame to avoid a large dt spike from the initial RAF timestamp.
        const dt = lastTime === null ? 0 : (time - lastTime) / 1000;
        lastTime = time;
        game.update(dt);
        game.render(ctx, canvas);
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
