import { PATTERNS } from '../generators/patterns.js';
import { smoothstep01 } from '../utils/easing.js';
import { createWall, moveWall, validateWallSegments } from './wall.js';
export const WallLifecycle = Object.freeze({
    APPROACHING: 'APPROACHING',
    BRAKING: 'BRAKING',
    FROZEN: 'FROZEN',
    TRANSFORMING: 'TRANSFORMING',
    RESUMING: 'RESUMING',
});
export const CLOSED_REVEAL_TIMING = Object.freeze({
    brake: 1.2,
    frozen: 0.5,
    transforming: 1.5,
    resume: 0.75,
});
const REVEAL_PATTERN = Object.freeze({
    4: PATTERNS[4].DOUBLE_ADJACENT,
    5: PATTERNS[5].TRIPLE_ADJACENT,
    6: PATTERNS[6].TRIPLE_ADJACENT,
    8: PATTERNS[8].QUAD_ADJACENT,
});
export function createClosedRevealWall(layout, sideCount, { thickness = layout.wallThickness, revealSegments = REVEAL_PATTERN[sideCount] } = {}) {
    validateWallSegments(revealSegments, sideCount, { requireGap: true });
    const wall = createWall({
        radius: layout.spawnRadius,
        thickness,
        segments: Array(sideCount).fill(1),
    }, sideCount, { requireGap: false });
    wall.choreography = {
        type: 'CLOSED_REVEAL',
        state: WallLifecycle.APPROACHING,
        elapsed: 0,
        movementScale: 1,
        stopRadius: getClosedRevealStopRadius(layout, sideCount),
        triggerRadius: null,
        revealSegments: revealSegments.slice(),
        revealed: false,
    };
    return wall;
}
export function getClosedRevealStopRadius(layout, sideCount) {
    // The nearest point of a polygon edge is its inradius, not its vertex radius.
    return (layout.playerRadius + layout.playerSize + layout.wallRevealSafety)
        / Math.cos(Math.PI / sideCount);
}
export function keepClosedRevealSafeAfterResize(wall, layout) {
    const event = wall.choreography;
    if (!event || event.revealed)
        return;
    event.stopRadius = getClosedRevealStopRadius(layout, wall.sideCount);
    wall.radius = Math.max(wall.radius, event.stopRadius);
}
export function updateChoreographedWall(wall, speed, dt, layout) {
    const event = wall.choreography;
    if (!event) {
        moveWall(wall, speed, dt);
        return;
    }
    let remaining = dt;
    while (remaining > 0) {
        if (event.state === WallLifecycle.APPROACHING) {
            if (event.revealed || speed <= 0) {
                moveWall(wall, speed, remaining);
                break;
            }
            event.stopRadius = getClosedRevealStopRadius(layout, wall.sideCount);
            // Smoothstep braking travels half of speed * duration; the extra margin
            // absorbs a frame crossing the trigger and small speed changes.
            const triggerRadius = event.stopRadius
                + speed * CLOSED_REVEAL_TIMING.brake / 2
                + layout.wallRevealTriggerMargin;
            event.triggerRadius = triggerRadius;
            const approachTime = Math.min(remaining, Math.max(0, (wall.radius - triggerRadius) / speed));
            moveWall(wall, speed, approachTime);
            remaining -= approachTime;
            if (remaining <= 0)
                break;
            enterState(event, WallLifecycle.BRAKING, 1);
            continue;
        }
        const duration = getStateDuration(event.state);
        const phaseDt = Math.min(remaining, duration - event.elapsed);
        const from = event.elapsed / duration;
        const to = (event.elapsed + phaseDt) / duration;
        if (event.state === WallLifecycle.BRAKING) {
            // Integrating the eased speed keeps travel independent of frame size.
            const distance = speed * duration * (brakeArea(to) - brakeArea(from));
            wall.radius = Math.max(event.stopRadius, wall.radius - distance);
            event.movementScale = 1 - smoothstep01(to);
        }
        else if (event.state === WallLifecycle.RESUMING) {
            const distance = speed * duration * (smoothstepArea(to) - smoothstepArea(from));
            wall.radius -= distance;
            event.movementScale = smoothstep01(to);
        }
        event.elapsed += phaseDt;
        remaining -= phaseDt;
        if (event.elapsed < duration)
            break;
        switch (event.state) {
            case WallLifecycle.BRAKING:
                enterState(event, WallLifecycle.FROZEN, 0);
                break;
            case WallLifecycle.FROZEN:
                wall.segments = event.revealSegments.slice();
                event.revealed = true;
                enterState(event, WallLifecycle.TRANSFORMING, 0);
                break;
            case WallLifecycle.TRANSFORMING:
                enterState(event, WallLifecycle.RESUMING, 0);
                break;
            case WallLifecycle.RESUMING:
                enterState(event, WallLifecycle.APPROACHING, 1);
                break;
        }
    }
}
export function getWallLifecycleDuration(state) {
    return state === WallLifecycle.APPROACHING ? null : getStateDuration(state);
}
function enterState(event, state, movementScale) {
    event.state = state;
    event.elapsed = 0;
    event.movementScale = movementScale;
}
function getStateDuration(state) {
    switch (state) {
        case WallLifecycle.BRAKING: return CLOSED_REVEAL_TIMING.brake;
        case WallLifecycle.FROZEN: return CLOSED_REVEAL_TIMING.frozen;
        case WallLifecycle.TRANSFORMING: return CLOSED_REVEAL_TIMING.transforming;
        case WallLifecycle.RESUMING: return CLOSED_REVEAL_TIMING.resume;
        default: throw new Error(`Unexpected wall lifecycle state: ${state}`);
    }
}
function smoothstepArea(t) {
    return t ** 3 - 0.5 * t ** 4;
}
function brakeArea(t) {
    return t - smoothstepArea(t);
}
