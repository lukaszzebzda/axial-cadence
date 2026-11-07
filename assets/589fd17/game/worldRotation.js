// Presentation motion shared by the arena and player. Collision uses their
// common unrotated frame, so a direction change does not shift hit geometry.
const HALF_CYCLE_SECONDS = 6;
const CYCLE_SECONDS = HALF_CYCLE_SECONDS * 2;
const START_OFFSET_SECONDS = 1;
const REVERSAL_SECONDS = 1;
const PULSE_SECONDS = 3;
export function createWorldRotationState() {
    return { rotation: 0, elapsed: 0, velocity: 0 };
}
export function resetWorldRotation(state) {
    state.rotation = 0;
    state.elapsed = 0;
    state.velocity = 0;
}
function smoothstep(value) {
    return value * value * (3 - 2 * value);
}
function directionAt(elapsed) {
    const phase = (elapsed + START_OFFSET_SECONDS) % CYCLE_SECONDS;
    const halfReversal = REVERSAL_SECONDS / 2;
    if (phase >= HALF_CYCLE_SECONDS - halfReversal
        && phase <= HALF_CYCLE_SECONDS + halfReversal) {
        const progress = (phase - HALF_CYCLE_SECONDS + halfReversal) / REVERSAL_SECONDS;
        return 1 - 2 * smoothstep(progress);
    }
    if (phase >= CYCLE_SECONDS - halfReversal || phase <= halfReversal) {
        const progress = phase >= CYCLE_SECONDS - halfReversal
            ? (phase - CYCLE_SECONDS + halfReversal) / REVERSAL_SECONDS
            : (phase + halfReversal) / REVERSAL_SECONDS;
        return -1 + 2 * smoothstep(progress);
    }
    return phase < HALF_CYCLE_SECONDS ? 1 : -1;
}
export function rotationVelocity(elapsed, peakSpeed, difficulty = 0) {
    const pulse = (1 - Math.cos(2 * Math.PI * elapsed / PULSE_SECONDS)) / 2;
    const modulation = 0.08 + 0.27 * difficulty;
    return directionAt(elapsed) * peakSpeed * (1 - modulation * pulse);
}
export function advanceWorldRotation(state, activeDt, peakSpeed, difficulty = 0) {
    if (activeDt === 0) {
        state.velocity = 0;
        return;
    }
    const midpoint = state.elapsed + activeDt / 2;
    state.rotation += rotationVelocity(midpoint, peakSpeed, difficulty) * activeDt;
    state.elapsed += activeDt;
    state.velocity = rotationVelocity(state.elapsed, peakSpeed, difficulty);
}
