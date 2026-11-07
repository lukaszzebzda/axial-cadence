import { isSupportedSideCount } from '../layout.js';
import { smoothstep01 } from '../utils/easing.js';
export const GeometryTransitionState = Object.freeze({
    NORMAL: 'NORMAL',
    WARNING: 'WARNING',
    WAITING: 'WAITING',
    SLOWDOWN: 'SLOWDOWN',
    FREEZE: 'FREEZE',
    RECOVERY: 'RECOVERY',
});
export const GEOMETRY_TRANSITION_CONFIG = Object.freeze({
    interval: 14, // ~15 s cycle, including the short transition and safe-window wait
    warningDuration: 0.2,
    slowdownDuration: 0.12,
    freezeDuration: 0.32,
    settleDuration: 0.18, // hold the fully morphed polygon before inward travel resumes
    applyProgress: 0.5,
    recoveryDuration: 0.16,
});
export const DEBUG_GEOMETRY_TRANSITION_CONFIG = Object.freeze({
    interval: 2.5,
    warningDuration: 0.12,
    slowdownDuration: 0.08,
    freezeDuration: 0.24,
    settleDuration: 0.18,
    applyProgress: 0.5,
    recoveryDuration: 0.12,
});
export function createGeometryState(sideCount, config = GEOMETRY_TRANSITION_CONFIG) {
    assertSupportedSideCount(sideCount);
    const resolvedConfig = Object.freeze({ ...GEOMETRY_TRANSITION_CONFIG, ...config });
    validateConfig(resolvedConfig);
    return {
        sideCount,
        transition: {
            config: resolvedConfig,
            state: GeometryTransitionState.NORMAL,
            targetSideCount: null,
            scheduleElapsed: 0,
            scheduleProgress: 0,
            phaseElapsed: 0,
            eventElapsed: 0,
            warningDuration: resolvedConfig.warningDuration,
            warningProgress: 0,
            slowdownProgress: 0,
            freezeProgress: 0,
            recoveryProgress: 0,
            transitionProgress: 0,
            geometryApplied: false,
        },
    };
}
export function advanceGeometrySchedule(geometry, simulationDt) {
    const transition = geometry.transition;
    if (transition.state !== GeometryTransitionState.NORMAL)
        return false;
    transition.scheduleElapsed += Math.max(0, simulationDt);
    transition.scheduleProgress = Math.min(transition.scheduleElapsed / transition.config.interval, 1);
    return transition.scheduleElapsed + 1e-9 >= transition.config.interval;
}
export function getGeometryScheduleRemaining(geometry) {
    const transition = geometry.transition;
    return Math.max(0, transition.config.interval - transition.scheduleElapsed);
}
export function requestGeometryTransition(geometry, targetSideCount, warningDuration = geometry.transition.config.warningDuration) {
    assertSupportedSideCount(targetSideCount);
    assertDuration('warningDuration', warningDuration);
    if (targetSideCount === geometry.sideCount) {
        cancelGeometryTransition(geometry);
        return false;
    }
    Object.assign(geometry.transition, {
        state: GeometryTransitionState.WARNING,
        targetSideCount,
        phaseElapsed: 0,
        eventElapsed: 0,
        warningDuration,
        warningProgress: warningDuration === 0 ? 1 : 0,
        slowdownProgress: 0,
        freezeProgress: 0,
        recoveryProgress: 0,
        transitionProgress: 0,
        geometryApplied: false,
    });
    return true;
}
export function advanceGeometryTransition(geometry, presentationDt, { canBeginSlowdown = true, canApply = true } = {}) {
    const transition = geometry.transition;
    const dt = Math.max(0, presentationDt);
    const result = { startedFreeze: false, shouldApply: false, completed: false };
    if (transition.state === GeometryTransitionState.NORMAL)
        return result;
    transition.phaseElapsed += dt;
    transition.eventElapsed += dt;
    switch (transition.state) {
        case GeometryTransitionState.WARNING:
            transition.warningProgress = phaseProgress(transition.phaseElapsed, transition.warningDuration);
            if (transition.warningProgress >= 1) {
                enterPhase(transition, GeometryTransitionState.WAITING);
            }
            break;
        case GeometryTransitionState.WAITING:
            if (canBeginSlowdown) {
                transition.slowdownProgress = 0;
                enterPhase(transition, GeometryTransitionState.SLOWDOWN);
            }
            break;
        case GeometryTransitionState.SLOWDOWN:
            transition.slowdownProgress = phaseProgress(transition.phaseElapsed, transition.config.slowdownDuration);
            if (transition.slowdownProgress >= 1) {
                if (canApply) {
                    enterPhase(transition, GeometryTransitionState.FREEZE);
                    result.startedFreeze = true;
                }
                else {
                    transition.slowdownProgress = 0;
                    enterPhase(transition, GeometryTransitionState.WAITING);
                }
            }
            break;
        case GeometryTransitionState.FREEZE:
            transition.freezeProgress = phaseProgress(transition.phaseElapsed, transition.config.freezeDuration);
            if (!transition.geometryApplied
                && transition.freezeProgress >= transition.config.applyProgress) {
                result.shouldApply = true;
                break;
            }
            // Morph reaches its target first; give the player a short readable hold
            // on the new polygon while rotation and steering continue.
            if (transition.phaseElapsed + 1e-9 >= transition.config.freezeDuration + transition.config.settleDuration) {
                enterPhase(transition, GeometryTransitionState.RECOVERY);
            }
            break;
        case GeometryTransitionState.RECOVERY:
            transition.recoveryProgress = phaseProgress(transition.phaseElapsed, transition.config.recoveryDuration);
            if (transition.recoveryProgress >= 1) {
                resetTransition(transition, true);
                result.completed = true;
            }
            break;
    }
    updateOverallProgress(transition);
    return result;
}
export function completeGeometryTransition(geometry) {
    const transition = geometry.transition;
    if (transition.state !== GeometryTransitionState.FREEZE || transition.geometryApplied) {
        throw new Error(`Cannot apply geometry transition from ${transition.state}.`);
    }
    geometry.sideCount = transition.targetSideCount;
    transition.geometryApplied = true;
}
export function getWorldSimulationScale(geometry) {
    const transition = geometry.transition;
    switch (transition.state) {
        case GeometryTransitionState.SLOWDOWN:
            return 1 - smoothstep01(transition.slowdownProgress);
        case GeometryTransitionState.FREEZE:
            return 0;
        case GeometryTransitionState.RECOVERY:
            return smoothstep01(transition.recoveryProgress);
        default:
            return 1;
    }
}
export function cancelGeometryTransition(geometry, resetSchedule = true) {
    resetTransition(geometry.transition, resetSchedule);
}
function enterPhase(transition, state) {
    transition.state = state;
    transition.phaseElapsed = 0;
}
function resetTransition(transition, resetSchedule) {
    Object.assign(transition, {
        state: GeometryTransitionState.NORMAL,
        targetSideCount: null,
        phaseElapsed: 0,
        eventElapsed: 0,
        warningDuration: transition.config.warningDuration,
        warningProgress: 0,
        slowdownProgress: 0,
        freezeProgress: 0,
        recoveryProgress: 0,
        transitionProgress: 0,
        geometryApplied: false,
    });
    if (resetSchedule) {
        transition.scheduleElapsed = 0;
        transition.scheduleProgress = 0;
    }
}
function updateOverallProgress(transition) {
    if (transition.state === GeometryTransitionState.NORMAL)
        return;
    const { slowdownDuration, freezeDuration, settleDuration, recoveryDuration } = transition.config;
    const totalDuration = transition.warningDuration
        + slowdownDuration
        + freezeDuration
        + settleDuration
        + recoveryDuration;
    const settled = transition.state === GeometryTransitionState.RECOVERY ? settleDuration
        : transition.state === GeometryTransitionState.FREEZE
            ? Math.min(settleDuration, Math.max(0, transition.phaseElapsed - freezeDuration)) : 0;
    const completedDuration = transition.warningDuration * transition.warningProgress
        + slowdownDuration * transition.slowdownProgress
        + freezeDuration * transition.freezeProgress
        + settled
        + recoveryDuration * transition.recoveryProgress;
    transition.transitionProgress = totalDuration === 0
        ? 1
        : Math.min(completedDuration / totalDuration, 1);
}
function phaseProgress(elapsed, duration) {
    return duration === 0 ? 1 : Math.min(elapsed / duration, 1);
}
function validateConfig(config) {
    if (!Number.isFinite(config.interval) || config.interval <= 0) {
        throw new Error(`Invalid geometry transition interval: ${config.interval}`);
    }
    assertDuration('warningDuration', config.warningDuration);
    assertDuration('slowdownDuration', config.slowdownDuration);
    assertDuration('freezeDuration', config.freezeDuration);
    assertDuration('settleDuration', config.settleDuration);
    assertDuration('recoveryDuration', config.recoveryDuration);
    if (!Number.isFinite(config.applyProgress)
        || config.applyProgress < 0
        || config.applyProgress > 1) {
        throw new Error(`Invalid geometry transition apply progress: ${config.applyProgress}`);
    }
}
function assertDuration(name, duration) {
    if (!Number.isFinite(duration) || duration < 0) {
        throw new Error(`Invalid geometry transition ${name}: ${duration}`);
    }
}
function assertSupportedSideCount(sideCount) {
    if (!isSupportedSideCount(sideCount)) {
        throw new Error(`Unsupported side count: ${sideCount}`);
    }
}
