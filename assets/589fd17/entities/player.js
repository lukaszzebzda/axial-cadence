export function createPlayer() {
    return { angle: 0, radius: 140, size: 6, speed: 3 };
}
export function applyLayout(player, layout) {
    player.radius = layout.playerRadius;
    player.size = layout.playerSize;
}
export function updatePlayer(player, dt, input) {
    if (input.left)
        player.angle -= player.speed * dt;
    if (input.right)
        player.angle += player.speed * dt;
}
export function resetPlayer(player) {
    player.angle = 0;
}
