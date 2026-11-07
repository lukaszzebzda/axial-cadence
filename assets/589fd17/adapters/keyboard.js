import { createInputController } from '../systems/input.js';
import { createDebugControls } from '../systems/debugControls.js';
export function createKeyboardControls(target, initialDebugEnabled = false) {
    const input = createInputController();
    const debug = createDebugControls(initialDebugEnabled);
    const onKeyDown = (event) => {
        input.handleKeyDown(event);
        debug.handleKeyDown(event);
    };
    const onKeyUp = (event) => input.handleKeyUp(event);
    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    return {
        readFrame() {
            return { ...input.readFrame(), geometryTarget: debug.consumeGeometryTarget() };
        },
        isDebugEnabled: debug.isEnabled,
        clear() { input.clear(); debug.clear(); },
        dispose() {
            target.removeEventListener('keydown', onKeyDown);
            target.removeEventListener('keyup', onKeyUp);
            input.clear();
            debug.clear();
        },
    };
}
