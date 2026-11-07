// Original procedural sketch, not the final soundtrack. No external samples.
export const DEMO_BPM = 120;
export const BEATS_PER_BAR = 4;
export const DEMO_BARS = 4;
export const DEMO_SAMPLE_RATE = 22050;
export const BAR_SECONDS = 60 / DEMO_BPM * BEATS_PER_BAR;
export function synthesizeDemo(sampleRate = DEMO_SAMPLE_RATE) {
    const length = Math.round(BAR_SECONDS * DEMO_BARS * sampleRate);
    const base = new Float32Array(length);
    const rhythm = new Float32Array(length);
    const roots = [45, 41, 48, 43];
    const thirds = [3, 4, 4, 4];
    const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
    let noiseState = 0x5eed; // Local timbre noise; independent of the game's RNG.
    for (let index = 0; index < length; index++) {
        const time = index / sampleRate;
        const bar = Math.floor(time / BAR_SECONDS);
        const barTime = time % BAR_SECONDS;
        const beatTime = time % 0.5;
        const eighthTime = time % 0.25;
        const beat = Math.floor(time / 0.5);
        const eighth = Math.floor(time / 0.25);
        const root = roots[bar];
        const padEnvelope = Math.min(1, barTime / 0.12, (BAR_SECONDS - barTime) / 0.12);
        const chord = [0, thirds[bar], 7].reduce((sum, interval) => sum
            + Math.sin(2 * Math.PI * frequency(root + 12 + interval) * barTime), 0);
        const bassEnvelope = Math.min(1, beatTime / 0.008) * Math.exp(-beatTime * 7);
        base[index] = chord * padEnvelope * 0.022
            + Math.sin(2 * Math.PI * frequency(root - 12) * beatTime) * bassEnvelope * 0.12;
        noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0;
        const noise = noiseState / 0x80000000 - 1;
        const kickPhase = 2 * Math.PI * (45 * beatTime + 75 * 0.025 * (1 - Math.exp(-beatTime / 0.025)));
        const kick = Math.sin(kickPhase) * Math.exp(-beatTime * 13) * 0.28;
        const hat = noise * Math.exp(-eighthTime * 65) * 0.025;
        const snare = beat % 2 === 1 ? noise * Math.exp(-beatTime * 24) * 0.075 : 0;
        const note = frequency(root + 12 + [0, 7, 12, 7][eighth % 4]);
        const pluckEnvelope = Math.min(1, eighthTime / 0.005) * Math.exp(-eighthTime * 21);
        rhythm[index] = kick + hat + snare + Math.sin(2 * Math.PI * note * eighthTime) * pluckEnvelope * 0.035;
        // Keep the repeated-buffer seam and initial attack free of a hard step.
        const edge = Math.min(1, index / (sampleRate * 0.003), (length - 1 - index) / (sampleRate * 0.003));
        base[index] *= edge;
        rhythm[index] *= edge;
    }
    return [base, rhythm];
}
export function createDemoBuffers(context) {
    return synthesizeDemo().map(samples => {
        const buffer = context.createBuffer(1, samples.length, DEMO_SAMPLE_RATE);
        buffer.copyToChannel(samples, 0);
        return buffer;
    });
}
