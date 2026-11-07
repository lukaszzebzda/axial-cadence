const GEOMETRY_KEYS = new Map([
    ['Digit4', 4], ['Digit5', 5], ['Digit6', 6], ['Digit8', 8],
]);
export function createDebugControls(initialEnabled = false) {
    let enabled = initialEnabled;
    let pendingGeometryTarget = null;
    return {
        handleKeyDown(event) {
            if (event.repeat)
                return;
            if (event.code === 'Backquote') {
                enabled = !enabled;
            }
            else if (enabled) {
                pendingGeometryTarget = GEOMETRY_KEYS.get(event.code) ?? pendingGeometryTarget;
            }
        },
        isEnabled: () => enabled,
        consumeGeometryTarget() {
            const target = pendingGeometryTarget;
            pendingGeometryTarget = null;
            return target;
        },
        clear() { pendingGeometryTarget = null; },
    };
}
