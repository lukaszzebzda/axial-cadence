export const EMPTY_INPUT_FRAME = Object.freeze({
    left: false, right: false, advance: false, pause: false,
    leftPressed: false, rightPressed: false, practiceDelta: 0, geometryTarget: null,
});
export function createInputFrame(values = {}) {
    return { ...EMPTY_INPUT_FRAME, ...values };
}
export function createInputController() {
    const held = { left: false, right: false };
    let advance = false;
    let pause = false;
    let leftPressed = false;
    let rightPressed = false;
    let practiceDelta = 0;
    return {
        held,
        handleKeyDown(event) {
            if (!event.repeat && event.key === 'ArrowUp')
                practiceDelta = -1;
            if (!event.repeat && event.key === 'ArrowDown')
                practiceDelta = 1;
            if (event.code === 'Space') {
                if (!event.repeat)
                    advance = true;
                return;
            }
            if (event.code === 'Escape') {
                if (!event.repeat)
                    pause = true;
                return;
            }
            if (event.key === 'ArrowLeft' || event.key === 'a') {
                held.left = true;
                if (!event.repeat)
                    leftPressed = true;
            }
            if (event.key === 'ArrowRight' || event.key === 'd') {
                held.right = true;
                if (!event.repeat)
                    rightPressed = true;
            }
        },
        handleKeyUp(event) {
            if (event.key === 'ArrowLeft' || event.key === 'a')
                held.left = false;
            if (event.key === 'ArrowRight' || event.key === 'd')
                held.right = false;
        },
        readFrame() {
            const frame = createInputFrame({ ...held, advance, pause, leftPressed, rightPressed, practiceDelta });
            advance = pause = leftPressed = rightPressed = false;
            practiceDelta = 0;
            return frame;
        },
        clear() {
            held.left = held.right = false;
            advance = pause = leftPressed = rightPressed = false;
            practiceDelta = 0;
        },
    };
}
