// Opt-in local diagnostic. Browser frame timing is observational and cannot
// change dt, the fixed tick, RNG, audio or gameplay state.
export function createFrameProfile(output) {
    const samples = [];
    let elapsed = 0;
    return {
        reset() { samples.length = 0; elapsed = 0; if (output)
            output.textContent = ''; },
        record(frame, update, render, droppedSeconds) {
            if (!output || frame <= 0 || frame > 2)
                return;
            samples.push({ frame: frame * 1000, update, render });
            if (samples.length > 600)
                samples.shift();
            elapsed += frame;
            if (elapsed < 1)
                return;
            elapsed = 0;
            const percentile = (key) => {
                const sorted = samples.map(sample => sample[key]).sort((a, b) => a - b);
                return sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2);
            };
            output.textContent = `Próbki: ${samples.length} · p95 klatki: ${percentile('frame')} ms\n`
                + `p95 update: ${percentile('update')} ms · render CPU: ${percentile('render')} ms\n`
                + `Odrzucony czas symulacji: ${droppedSeconds.toFixed(3)} s`;
        },
    };
}
