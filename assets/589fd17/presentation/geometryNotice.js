const WARNING_LEAD_SECONDS = 1.3;
const CONFIRMATION_SECONDS = 1;
const FADE_OUT_SECONDS = 0.2;
export function createGeometryNotice() {
    return { appliedSideCount: null, remaining: 0 };
}
export function advanceGeometryNotice(notice, seconds) {
    notice.remaining = Math.max(0, notice.remaining - seconds);
}
export function confirmGeometryNotice(notice, sideCount) {
    notice.appliedSideCount = sideCount;
    notice.remaining = CONFIRMATION_SECONDS;
}
// Preview the existing schedule without choosing the next polygon early. That
// choice must retain its place in the seeded RNG stream. Clearance may delay it.
export function getGeometryNotice(geometry, notice, automaticGeometry) {
    const t = geometry.transition;
    const c = t.config;
    const applyTime = c.freezeDuration * c.applyProgress;
    let untilApply;
    switch (t.state) {
        case 'WARNING':
            untilApply = (1 - t.warningProgress) * t.warningDuration + c.slowdownDuration + applyTime;
            break;
        case 'WAITING':
            untilApply = c.slowdownDuration + applyTime;
            break;
        case 'SLOWDOWN':
            untilApply = (1 - t.slowdownProgress) * c.slowdownDuration + applyTime;
            break;
        case 'FREEZE':
            untilApply = Math.max(0, applyTime - t.phaseElapsed);
            break;
        default: untilApply = Infinity;
    }
    if (Number.isFinite(untilApply) && !t.geometryApplied) {
        return {
            label: `GEOMETRY SHIFT: ${t.targetSideCount}`,
            progress: Math.max(0, 1 - untilApply / WARNING_LEAD_SECONDS),
            confirmed: false, waiting: t.state === 'WAITING', opacity: 1,
        };
    }
    if (notice.remaining > 1e-9 && notice.appliedSideCount !== null) {
        return { label: `GEOMETRY: ${notice.appliedSideCount} SIDES`, progress: 1,
            confirmed: true, waiting: false, opacity: Math.min(1, notice.remaining / FADE_OUT_SECONDS) };
    }
    if (t.state !== 'NORMAL' || !automaticGeometry)
        return null;
    untilApply = Math.max(0, c.interval - t.scheduleElapsed)
        + c.warningDuration + c.slowdownDuration + applyTime;
    if (untilApply > WARNING_LEAD_SECONDS + 1e-9)
        return null;
    return { label: 'GEOMETRY SHIFT SOON', progress: Math.max(0, 1 - untilApply / WARNING_LEAD_SECONDS),
        confirmed: false, waiting: false, opacity: 1 };
}
