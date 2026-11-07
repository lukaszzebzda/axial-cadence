import { smoothstep01 } from '../utils/easing.js';
import { thicknessSpawnDelay } from '../generators/wallThickness.js';
import { moveWall } from '../entities/wall.js';
import { updateChoreographedWall } from '../entities/wallChoreography.js';
export const OPENING_REACTION_SECONDS = 1.7;
const RAMP_SECONDS = 1.5;
const INITIAL_SPEED_SCALE = 2 / 3;
// Smoothstep averages to 1/2. Account for the lost travel during acceleration
// so the nearest face arrives after about 1.7 s, rather than adding a pause.
const OPENING_TRAVEL_SECONDS = OPENING_REACTION_SECONDS
    - RAMP_SECONDS * (1 - INITIAL_SPEED_SCALE) / 2;
export function openingSpeedScale(worldElapsed) {
    return INITIAL_SPEED_SCALE + (1 - INITIAL_SPEED_SCALE)
        * smoothstep01(Math.min(worldElapsed / RAMP_SECONDS, 1));
}
// Only the opening wave is pre-positioned. Subsequent spawns stay offscreen.
export function primeOpeningWave(obstacles, layout, sideCount, difficulty, spawnWall) {
    const speed = difficulty.wallSpeed * layout.unit;
    const firstRadius = (layout.playerRadius + layout.playerSize) / Math.cos(Math.PI / sideCount)
        + speed * OPENING_TRAVEL_SECONDS;
    let radius = firstRadius;
    let count = 0;
    while (radius <= layout.spawnRadius) {
        spawnWall();
        const wall = obstacles.walls[obstacles.walls.length - 1];
        wall.radius = radius;
        count++;
        radius += speed * (difficulty.spawnEvery
            + thicknessSpawnDelay(wall.thickness, layout.wallThickness, speed, sideCount));
    }
    // Continue the same radial spacing with the next normal offscreen spawn.
    obstacles.spawnTimer = count === 0 ? 0
        : difficulty.spawnEvery - (radius - layout.spawnRadius) / speed;
    return count;
}
// Advance authored content offscreen without advancing score, RNG or geometry.
// Stop before the first wall reaches the orbit; later entries keep their spacing.
export function primeSequenceOpening(runner, obstacles, layout, sideCount, difficulty) {
    const context = { walls: obstacles.walls, layout, activeSideCount: sideCount,
        geometryTransitionState: 'NORMAL' };
    const first = runner.update(0, context);
    if (!first)
        return;
    obstacles.walls.push(first);
    const speed = difficulty.wallSpeed * layout.unit;
    const target = (layout.playerRadius + layout.playerSize) / Math.cos(Math.PI / sideCount)
        + speed * OPENING_TRAVEL_SECONDS;
    let remaining = Math.max(0, (first.radius - target) / speed);
    while (remaining > 1e-9) {
        const dt = Math.min(remaining, 1 / 120);
        const wall = runner.update(dt, context);
        if (wall)
            obstacles.walls.push(wall);
        for (const active of obstacles.walls) {
            if (active.choreography)
                updateChoreographedWall(active, speed, dt, layout);
            else
                moveWall(active, speed, dt);
        }
        remaining -= dt;
    }
}
