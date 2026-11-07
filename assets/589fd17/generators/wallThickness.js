// Preserve room to steer after a deeper wall instead of stacking the next one
// into its trailing face. Values are all in the same reference/pixel scale.
export function thicknessSpawnDelay(thickness, baseThickness, speed, sideCount) {
    return Math.max(0, thickness - baseThickness) / (speed * Math.cos(Math.PI / sideCount));
}
