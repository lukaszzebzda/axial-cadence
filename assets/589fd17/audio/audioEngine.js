import { createDemoBuffers } from './demoTrack.js';
import { playEffect } from './effects.js';
import { createMusicTransport } from './musicTransport.js';
// Browser adapter. It is safe to construct/import without DOM or Web Audio.
export function createAudioEngine({ createContext = () => new AudioContext(), createBuffers = createDemoBuffers, onStatusChange = () => { } } = {}) {
    const settings = { musicVolume: 0.35, effectsVolume: 0.45,
        musicMuted: false, effectsMuted: false };
    let context = null;
    let music = null;
    let effects = null;
    let transport = null;
    let state = 'stopped';
    let status = 'locked';
    let activating = false;
    let startEffectPending = false;
    let disposed = false;
    function fail() {
        status = 'unavailable';
        transport?.flushCue();
        try {
            transport?.dispose();
        }
        catch { /* Audio failure must not affect gameplay. */ }
        transport = null;
        if (context)
            void context.close().catch(() => { });
        context = null;
        onStatusChange();
    }
    function safe(action) {
        if (disposed || status === 'unavailable')
            return;
        try {
            action();
        }
        catch {
            fail();
        }
    }
    function applyVolumes() {
        if (!context || !music || !effects)
            return;
        for (const [bus, value] of [[music, settings.musicMuted ? 0 : settings.musicVolume],
            [effects, settings.effectsMuted ? 0 : settings.effectsVolume]]) {
            bus.gain.cancelScheduledValues(context.currentTime);
            bus.gain.setTargetAtTime(value, context.currentTime, 0.015);
        }
    }
    function effect(kind) {
        if (status === 'ready' && context && effects && !settings.effectsMuted)
            playEffect(context, effects, kind);
    }
    function reconcile() {
        if (status !== 'ready' || !transport)
            return;
        if (state === 'running') {
            transport.resume();
            if (startEffectPending) {
                startEffectPending = false;
                effect('start');
            }
        }
        else if (state === 'paused')
            transport.pause();
        else
            transport.stop();
    }
    return {
        // Call directly inside a trusted key/pointer handler, never from RAF.
        activate() {
            if (disposed || status === 'unavailable' || activating)
                return;
            safe(() => {
                if (!context) {
                    context = createContext();
                    music = context.createGain();
                    effects = context.createGain();
                    music.connect(context.destination);
                    effects.connect(context.destination);
                    transport = createMusicTransport(context, createBuffers(context), music);
                    applyVolumes();
                }
                activating = true;
                void context.resume().then(() => {
                    activating = false;
                    if (disposed || !context)
                        return;
                    safe(() => { status = context?.state === 'running' ? 'ready' : 'locked'; reconcile(); onStatusChange(); });
                }).catch(() => { activating = false; fail(); });
            });
        },
        restart() {
            state = 'running';
            startEffectPending = true;
            safe(() => { transport?.stop(); reconcile(); });
            onStatusChange();
        },
        setState(next) {
            if (next === state)
                return;
            const hit = state === 'running' && next === 'stopped';
            state = next;
            if (next === 'stopped')
                startEffectPending = false;
            safe(() => { reconcile(); if (hit)
                effect('hit'); });
            onStatusChange();
        },
        scheduleCue(intensity, apply) {
            if (status !== 'ready' || context?.state !== 'running' || state !== 'running' || !transport)
                return false;
            let scheduled = false;
            safe(() => { scheduled = transport.queue(intensity, () => { apply(); effect('shift'); }); });
            return scheduled;
        },
        update() {
            safe(() => {
                if (status === 'ready' && context?.state !== 'running') {
                    status = 'locked';
                    transport?.flushCue();
                    transport?.pause();
                    onStatusChange();
                }
                transport?.update();
            });
        },
        setSettings(values) {
            for (const key of ['musicVolume', 'effectsVolume']) {
                const value = values[key];
                if (value !== undefined) {
                    if (!Number.isFinite(value))
                        throw new Error('Invalid audio volume');
                    settings[key] = Math.max(0, Math.min(1, value));
                }
            }
            if (values.musicMuted !== undefined)
                settings.musicMuted = values.musicMuted;
            if (values.effectsMuted !== undefined)
                settings.effectsMuted = values.effectsMuted;
            safe(applyVolumes);
            onStatusChange();
        },
        getStatus() { return { status, state, settings: { ...settings }, transport: transport?.getStatus() ?? null }; },
        dispose() {
            disposed = true;
            try {
                transport?.dispose();
            }
            catch { /* teardown only */ }
            if (context)
                void context.close().catch(() => { });
            context = null;
        },
    };
}
