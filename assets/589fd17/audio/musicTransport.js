import { BAR_SECONDS } from './demoTrack.js';
const START_LEAD = 0.025;
const LAYER_FADE = 0.25;
// Web Audio loops supply the rhythm; RAF only delivers the accompanying visual
// cue. All positions are on this transport's audio clock, never on score/RAF dt.
export function createMusicTransport(context, buffers, output) {
    const gate = context.createGain();
    const layer = context.createGain();
    gate.connect(output);
    layer.connect(gate);
    gate.gain.value = 0;
    layer.gain.value = 0;
    let sources = [];
    let running = false;
    let offset = 0;
    let anchor = 0;
    let fade = { position: 0, from: 0, to: 0 };
    let pending = null;
    function position() { return offset + (running ? Math.max(0, context.currentTime - anchor) : 0); }
    function intensityAt(at) {
        const progress = Math.max(0, Math.min(1, (at - fade.position) / LAYER_FADE));
        return fade.from + (fade.to - fade.from) * progress;
    }
    function update() {
        if (!running || !pending || position() + 1e-9 < pending.position)
            return;
        const cue = pending;
        pending = null;
        fade = { position: cue.position, from: intensityAt(cue.position), to: cue.intensity };
        cue.apply();
    }
    function automateLayer() {
        const at = position();
        const now = context.currentTime;
        const timeFor = (value) => Math.max(now, anchor + value - offset);
        layer.gain.cancelScheduledValues(now);
        layer.gain.setValueAtTime(intensityAt(at), now);
        const end = fade.position + LAYER_FADE;
        if (end > at)
            layer.gain.linearRampToValueAtTime(fade.to, timeFor(end));
        if (pending) {
            layer.gain.setValueAtTime(intensityAt(pending.position), timeFor(pending.position));
            layer.gain.linearRampToValueAtTime(pending.intensity, timeFor(pending.position + LAYER_FADE));
        }
    }
    function stopSources() {
        const now = context.currentTime;
        gate.gain.cancelScheduledValues(now);
        gate.gain.setValueAtTime(gate.gain.value, now);
        gate.gain.linearRampToValueAtTime(0, now + 0.008);
        for (const source of sources) {
            source.stop(now + 0.01);
            source.onended = () => source.disconnect();
        }
        sources = [];
    }
    function pause() {
        if (!running)
            return;
        update();
        offset = position();
        running = false;
        stopSources();
    }
    function stop() {
        pending = null;
        pause();
        offset = 0;
        fade = { position: 0, from: 0, to: 0 };
        layer.gain.cancelScheduledValues(context.currentTime);
        layer.gain.setValueAtTime(0, context.currentTime);
    }
    function resume() {
        if (running)
            return;
        anchor = context.currentTime + START_LEAD;
        running = true;
        sources = buffers.map((buffer, index) => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(index === 0 ? gate : layer);
            source.start(anchor, offset % buffer.duration);
            return source;
        });
        gate.gain.cancelScheduledValues(context.currentTime);
        gate.gain.setValueAtTime(0, context.currentTime);
        gate.gain.linearRampToValueAtTime(1, anchor + 0.01);
        automateLayer();
    }
    return {
        restart() { stop(); resume(); },
        resume, pause, stop, update,
        queue(intensity, apply) {
            if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1)
                throw new Error('Invalid music intensity');
            if (!running)
                return false;
            update();
            // Leave already-starting bars alone; multiple requests coalesce to latest.
            const nextBar = Math.floor((position() + 0.05) / BAR_SECONDS) + 1;
            pending = { position: nextBar * BAR_SECONDS, intensity, apply };
            automateLayer();
            return true;
        },
        flushCue() { const cue = pending; pending = null; cue?.apply(); },
        getStatus() {
            const at = position();
            return { running, position: at, bar: Math.floor(at / BAR_SECONDS) + 1,
                intensity: intensityAt(at), pendingBar: pending ? pending.position / BAR_SECONDS + 1 : null };
        },
        dispose() { stop(); gate.disconnect(); layer.disconnect(); },
    };
}
