export function playEffect(context, output, effect) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    const duration = effect === 'hit' ? 0.22 : 0.1;
    oscillator.type = effect === 'hit' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(effect === 'hit' ? 140 : effect === 'shift' ? 660 : 330, now);
    oscillator.frequency.exponentialRampToValueAtTime(effect === 'hit' ? 45 : 880, now + duration);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(effect === 'hit' ? 0.18 : 0.09, now + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
