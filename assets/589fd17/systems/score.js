export function createScoreState() {
    return { value: 0, compensation: 0 };
}
export function addScore(score, dt) {
    // Compensated sum keeps long fixed-tick runs accurate without display rounding.
    const corrected = dt - score.compensation;
    const next = score.value + corrected;
    score.compensation = (next - score.value) - corrected;
    score.value = next;
}
export function resetScore(score) {
    score.value = 0;
    score.compensation = 0;
}
