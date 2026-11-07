export function mountAudioControls(document, audio, onOpen, onClose) {
    const panel = document.getElementById('audio-panel');
    if (!panel)
        return { isOpen: false, refresh() { }, dispose() { } };
    const status = panel.querySelector('[data-audio-status]');
    const musicVolume = panel.querySelector('#music-volume');
    const effectsVolume = panel.querySelector('#effects-volume');
    const musicMuted = panel.querySelector('#music-muted');
    const effectsMuted = panel.querySelector('#effects-muted');
    const back = panel.querySelector('[data-audio-close]');
    const activate = () => audio.activate();
    const stopKeys = (event) => {
        event.stopPropagation();
        if (!event.repeat && (event.code === 'Space' || event.code === 'Enter'))
            audio.activate();
        if (event.key === 'Escape') {
            event.preventDefault();
            panel.open = false;
        }
    };
    const change = () => {
        audio.setSettings({ musicVolume: Number(musicVolume.value) / 100,
            effectsVolume: Number(effectsVolume.value) / 100,
            musicMuted: musicMuted.checked, effectsMuted: effectsMuted.checked });
    };
    const toggle = () => { if (panel.open)
        onOpen();
    else
        onClose(); };
    const close = () => { panel.open = false; };
    panel.addEventListener('keydown', stopKeys);
    panel.addEventListener('pointerdown', activate);
    panel.addEventListener('input', change);
    panel.addEventListener('toggle', toggle);
    back.addEventListener('click', close);
    return {
        get isOpen() { return panel.open; },
        refresh() {
            const snapshot = audio.getStatus();
            const message = snapshot.status === 'unavailable' ? 'Dźwięk niedostępny — gra działa dalej.'
                : snapshot.status === 'locked' ? 'Dźwięk uruchomi się po naciśnięciu Space.'
                    : snapshot.state === 'running' ? 'Podkład testowy · muzyka adaptacyjna'
                        : snapshot.state === 'paused' ? 'Muzyka wstrzymana.' : 'Muzyka czeka na grę.';
            if (status.textContent !== message)
                status.textContent = message;
            musicVolume.value = String(Math.round(snapshot.settings.musicVolume * 100));
            effectsVolume.value = String(Math.round(snapshot.settings.effectsVolume * 100));
            musicMuted.checked = snapshot.settings.musicMuted;
            effectsMuted.checked = snapshot.settings.effectsMuted;
        },
        dispose() {
            panel.removeEventListener('keydown', stopKeys);
            panel.removeEventListener('pointerdown', activate);
            panel.removeEventListener('input', change);
            panel.removeEventListener('toggle', toggle);
            back.removeEventListener('click', close);
        },
    };
}
