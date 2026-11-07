import { thicknessSpawnDelay } from '../generators/wallThickness.js';
import { createSequenceRunner } from '../sequences/sequenceRunner.js';
// Phrase composition is opt-in until its cadence has been playtested.
export function createEpisodeCoordinator({ phrasesEnabled = false, wallsPerEpisode = 8 } = {}) {
    if (!Number.isInteger(wallsPerEpisode) || wallsPerEpisode < 1) {
        throw new Error('Episode requires a positive integer wall count.');
    }
    let phase;
    let wallCount;
    let runner;
    let previousSequenceId;
    reset();
    return {
        update(dt, { obstacles, layout, sideCount, transitionState, difficulty, generator, spawnWall }) {
            if (!Number.isFinite(dt) || dt < 0)
                throw new Error(`Invalid episode dt: ${dt}`);
            // A frozen world must not select content, spawn, or complete an episode.
            if (dt === 0)
                return;
            if (runner) {
                obstacles.spawnTimer = 0;
                const wall = runner.update(dt, {
                    walls: obstacles.walls,
                    layout,
                    activeSideCount: sideCount,
                    geometryTransitionState: transitionState,
                });
                if (wall)
                    obstacles.walls.push(wall);
                if (runner.getStatus().completed) {
                    runner = null;
                    phase = 'WALLS';
                    wallCount = 0;
                }
                return;
            }
            // Geometry takes priority over starting a new phrase. Active phrases
            // finish under their geometry lock, including during WARNING/WAITING.
            if (phase === 'DRAINING' && transitionState !== 'NORMAL') {
                phase = 'WALLS';
                wallCount = 0;
            }
            if (phase === 'DRAINING') {
                obstacles.spawnTimer = 0;
                if (obstacles.walls.length > 0)
                    return;
                const selected = generator.nextSequence(sideCount, difficulty.t, previousSequenceId);
                if (selected) {
                    previousSequenceId = selected.id;
                    runner = createSequenceRunner(selected.sequence, sideCount, { repeat: false });
                    phase = 'SEQUENCE';
                }
                else {
                    phase = 'WALLS';
                    wallCount = 0;
                }
                return;
            }
            obstacles.spawnTimer += dt;
            if (obstacles.spawnTimer + 1e-9 >= difficulty.spawnEvery) {
                obstacles.spawnTimer = 0;
                spawnWall();
                const spawned = obstacles.walls[obstacles.walls.length - 1];
                if (spawned && difficulty.wallSpeed > 0) {
                    obstacles.spawnTimer -= thicknessSpawnDelay(spawned.thickness, layout.wallThickness, difficulty.wallSpeed * layout.unit, sideCount);
                }
                wallCount++;
                if (phrasesEnabled && generator.nextSequence && wallCount >= wallsPerEpisode
                    && transitionState === 'NORMAL') {
                    phase = 'DRAINING';
                }
            }
        },
        reset,
        isGeometryLocked() { return runner?.isGeometryLocked() ?? false; },
        getStatus() {
            return { phase, wallCount, previousSequenceId, sequence: runner?.getStatus() ?? null };
        },
    };
    function reset(initialWallCount = 0) {
        phase = 'WALLS';
        wallCount = initialWallCount;
        runner = null;
        previousSequenceId = null;
    }
}
