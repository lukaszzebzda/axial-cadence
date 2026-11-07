import { GameState } from './GameState.js';
import { GameMode, GAME_MODES, shouldPauseWhenHidden } from './GameMode.js';
import { advanceGeometrySchedule, advanceGeometryTransition, cancelGeometryTransition, completeGeometryTransition, createGeometryState, GeometryTransitionState, getGeometryScheduleRemaining, getWorldSimulationScale, requestGeometryTransition, } from './geometryTransition.js';
import { EMPTY_INPUT_FRAME } from '../systems/input.js';
import { createPlayer, resetPlayer, applyLayout } from '../entities/player.js';
import { movePlayerAgainstWalls } from '../systems/playerMovement.js';
import { createWall, moveWall, isWallDead, remapWallLayout } from '../entities/wall.js';
import { createClosedRevealWall, keepClosedRevealSafeAfterResize, updateChoreographedWall, } from '../entities/wallChoreography.js';
import { checkCollision } from '../systems/collision.js';
import { hasGeometryTransitionClearance, remapWallsGeometry, } from '../systems/wallGeometry.js';
import { addScore, createScoreState, resetScore } from '../systems/score.js';
import { createBestScoreRecord } from '../systems/record.js';
import { computeDifficulty } from '../systems/difficulty.js';
import { computeLayout, resolveSideCount } from '../layout.js';
import { smoothstep01 } from '../utils/easing.js';
import { createRandomGenerator } from '../generators/randomGenerator.js';
import { createSeededGenerator } from '../generators/seededGenerator.js';
import { createTrainingGenerator } from '../generators/trainingGenerator.js';
import { createSequenceRunner } from '../sequences/sequenceRunner.js';
import { createEpisodeCoordinator } from './episodeCoordinator.js';
import { render } from '../render/renderer.js';
import { advanceWorldRotation, createWorldRotationState, resetWorldRotation } from './worldRotation.js';
import { primeOpeningWave, primeSequenceOpening, openingSpeedScale } from './openingWave.js';
import { TRAINING_EXERCISES } from '../sequences/trainingExercises.js';
import { createGeometryNotice, advanceGeometryNotice, confirmGeometryNotice } from '../presentation/geometryNotice.js';
const DEFAULT_SEED = 'hexagon';
export const SIMULATION_TICK_RATE = 120;
export const SIMULATION_TICK_SECONDS = 1 / SIMULATION_TICK_RATE;
export const MAX_STEPS_PER_UPDATE = 240;
export const MAX_BACKLOG_TICKS = MAX_STEPS_PER_UPDATE;
const TICK_EPSILON = 1e-9;
export class Game {
    get practiceLabel() { return TRAINING_EXERCISES[this._practiceIndex].label; }
    get practiceIndex() { return this._practiceIndex; }
    /**
     * @param {object} [opts]
     * @param {string|null} [opts.seed]
     *   Text seed from URL (?seed=foo). Pre-selects SEEDED mode if provided.
     * @param {number|string|null} [opts.sideCount]
     *   Optional startup side count override for development/testing.
     * @param {object} [opts.geometryTransitionConfig]
     *   Optional transition timing overrides for development/testing.
     * @param {boolean} [opts.closedRevealDemo]
     *   Isolated repeating debug choreography; ordinary wall generation stays unchanged.
     * @param {object|null} [opts.sequence]
     *   Optional authored sequence definition selected by development activation.
     * @param {boolean} [opts.episodes]
     *   Opt-in phrase composition; default preserves the existing wall-only balance.
     * @param {BestScoreRecord} [opts.record]
     *   Optional shared record; without one each Game keeps its own memory record.
     */
    constructor({ seed = null, sideCount = null, geometryTransitionConfig, closedRevealDemo = false, sequence = null, episodes = false, quickStart = true, record = createBestScoreRecord(), onEvent, } = {}) {
        this.clock = { pendingTicks: 0, droppedSeconds: 0 };
        this._input = { left: false, right: false };
        this._openingElapsed = 0;
        this._practiceIndex = 0;
        this.state = GameState.START;
        this.player = createPlayer();
        this.score = createScoreState();
        this.record = record;
        this._onEvent = onEvent;
        this._seededSideCountOverride = sideCount === null ? null : resolveSideCount(sideCount);
        this.geometry = createGeometryState(resolveSideCount(sideCount), geometryTransitionConfig);
        this.time = {
            simulationScale: 1,
            playerScale: 1,
            playerIndependent: true,
        };
        this.presentation = {
            geometryMorph: null,
            geometryNotice: createGeometryNotice(),
        };
        this._modeIndex = seed !== null ? GAME_MODES.indexOf(GameMode.SEEDED) : 0;
        this.mode = GAME_MODES[this._modeIndex];
        this.seed = seed ?? DEFAULT_SEED;
        this.closedRevealDemo = closedRevealDemo;
        this._quickStart = quickStart;
        this.episodeCoordinator = createEpisodeCoordinator({ phrasesEnabled: episodes });
        this._explicitSequence = sequence !== null;
        this.sequenceRunner = sequence
            ? createSequenceRunner(sequence, this.geometry.sideCount)
            : null;
        this.generator = null;
        this.diff = computeDifficulty(0);
        // Default layout at FullHD so the object is never null.
        // resize() overwrites this with real canvas dimensions before the first frame.
        this.layout = computeLayout(1920, 1080);
        this.world = createWorldRotationState();
        this.obstacles = {
            walls: [],
            spawnTimer: 0,
        };
    }
    /**
     * Recompute layout geometry from the current canvas dimensions.
     * Call on startup and whenever the canvas is resized.
     * Rescales any active wall radii to stay consistent with the new pixel scale.
     *
     * @param {HTMLCanvasElement} canvas
     */
    resize(canvas) {
        const previousLayout = this.layout;
        const nextLayout = computeLayout(canvas.width, canvas.height);
        for (const wall of this.obstacles.walls) {
            remapWallLayout(wall, previousLayout, nextLayout);
            keepClosedRevealSafeAfterResize(wall, nextLayout);
        }
        this.layout = nextLayout;
        applyLayout(this.player, this.layout);
    }
    get bestScore() { return this.record.getBestScore(this.mode); }
    update(dt, frame = EMPTY_INPUT_FRAME) {
        if (!Number.isFinite(dt) || dt < 0)
            throw new Error(`Invalid frame dt: ${dt}`);
        this._input.left = frame.left;
        this._input.right = frame.right;
        const wasRunning = this.state === GameState.RUNNING;
        this._handleCommands(frame);
        if (!wasRunning || this.state !== GameState.RUNNING)
            return;
        const acceptedSeconds = Math.min(dt, MAX_BACKLOG_TICKS / SIMULATION_TICK_RATE);
        this.clock.droppedSeconds += dt - acceptedSeconds;
        this.clock.pendingTicks += acceptedSeconds * SIMULATION_TICK_RATE;
        if (this.clock.pendingTicks > MAX_BACKLOG_TICKS) {
            this.clock.droppedSeconds += (this.clock.pendingTicks - MAX_BACKLOG_TICKS) / SIMULATION_TICK_RATE;
            this.clock.pendingTicks = MAX_BACKLOG_TICKS;
        }
        let steps = 0;
        while (this.clock.pendingTicks + TICK_EPSILON >= 1
            && steps < MAX_STEPS_PER_UPDATE && this.state === GameState.RUNNING) {
            this.clock.pendingTicks = Math.max(0, this.clock.pendingTicks - 1);
            this._updateRunning(SIMULATION_TICK_SECONDS);
            this._onEvent?.({ type: 'presentation-advanced', seconds: SIMULATION_TICK_SECONDS });
            steps++;
        }
        // A zero-time update still checks collision and immediate sequence events.
        if (dt === 0 && steps === 0 && this.clock.pendingTicks < 1)
            this._updateRunning(0);
        this._clearPendingAfterDeath();
    }
    _clearPendingAfterDeath() {
        if (this.state === GameState.GAME_OVER)
            this.clock.pendingTicks = 0;
    }
    _handleCommands(frame) {
        const geometryTarget = frame.geometryTarget;
        if (geometryTarget !== null && this.state !== GameState.GAME_OVER) {
            this.requestGeometryTransition(geometryTarget);
        }
        const advance = frame.advance;
        const pause = frame.pause;
        switch (this.state) {
            case GameState.START:
                if (frame.leftPressed)
                    this._cycleMode(-1);
                if (frame.rightPressed)
                    this._cycleMode(+1);
                if (this.mode === GameMode.TRAINING && !this._explicitSequence && frame.practiceDelta) {
                    this._practiceIndex = (this._practiceIndex + Math.sign(frame.practiceDelta)
                        + TRAINING_EXERCISES.length) % TRAINING_EXERCISES.length;
                }
                if (advance)
                    this._startRun();
                break;
            case GameState.RUNNING:
                if (pause) {
                    this.state = GameState.PAUSED;
                    this.clock.pendingTicks = 0;
                    break;
                }
                break;
            case GameState.PAUSED:
                if (pause || advance)
                    this.state = GameState.RUNNING;
                break;
            case GameState.GAME_OVER:
                if (pause) {
                    this.returnToMenu();
                    break;
                }
                if (advance)
                    this._reset();
                break;
        }
    }
    render(ctx, canvas, debugEnabled = false) {
        render(ctx, canvas, this, debugEnabled);
    }
    handleBackgrounding() {
        this._input.left = this._input.right = false;
        this.clock.pendingTicks = 0;
        if (this.state !== GameState.RUNNING || !shouldPauseWhenHidden(this.mode)) {
            return false;
        }
        this.state = GameState.PAUSED;
        return true;
    }
    configureStart({ mode = this.mode, seed = this.seed, practiceIndex = this._practiceIndex }) {
        if (this.state !== GameState.START)
            return false;
        const modeIndex = GAME_MODES.indexOf(mode);
        if (modeIndex < 0 || typeof seed !== 'string' || !Number.isInteger(practiceIndex)
            || practiceIndex < 0 || practiceIndex >= TRAINING_EXERCISES.length) {
            throw new Error('Invalid start configuration.');
        }
        this.mode = mode;
        this._modeIndex = modeIndex;
        this.seed = seed;
        this._practiceIndex = practiceIndex;
        return true;
    }
    returnToMenu() {
        if (this.state !== GameState.PAUSED && this.state !== GameState.GAME_OVER)
            return false;
        // Leaving a paused run completes the attempt with its earned survival time.
        this.record.submitScore(this.score.value, this.mode);
        this.state = GameState.START;
        this.clock.pendingTicks = 0;
        this._input.left = this._input.right = false;
        resetScore(this.score);
        this.obstacles.walls = [];
        this.obstacles.spawnTimer = 0;
        cancelGeometryTransition(this.geometry);
        this.presentation.geometryMorph = null;
        this.presentation.geometryNotice = createGeometryNotice();
        this.setSimulationTimeScale(1);
        return true;
    }
    requestGeometryTransition(targetSideCount, warningDuration) {
        const accepted = requestGeometryTransition(this.geometry, Number(targetSideCount), warningDuration);
        if (accepted)
            this.presentation.geometryMorph = null;
        return accepted;
    }
    setSimulationTimeScale(scale) {
        if (!Number.isFinite(scale) || scale < 0) {
            throw new Error(`Invalid simulation time scale: ${scale}`);
        }
        this.time.simulationScale = scale;
    }
    // ─── private ───────────────────────────────────────────────────────────────
    _cycleMode(dir) {
        this._modeIndex = (this._modeIndex + dir + GAME_MODES.length) % GAME_MODES.length;
        this.mode = GAME_MODES[this._modeIndex];
    }
    _createGenerator() {
        switch (this.mode) {
            case GameMode.SEEDED: return createSeededGenerator(this.seed, this.geometry.sideCount);
            case GameMode.TRAINING: return createTrainingGenerator(this.geometry.sideCount);
            default: return createRandomGenerator(this.geometry.sideCount);
        }
    }
    _startRun() {
        if (this.mode !== GameMode.SEEDED)
            this.geometry.sideCount = this._seededSideCountOverride ?? 6;
        this.generator = this._createGenerator();
        this._reset();
    }
    _updateRunning(presentationDt) {
        advanceGeometryNotice(this.presentation.geometryNotice, presentationDt);
        if (this._automaticGeometryEnabled()
            && this.geometry.transition.state === GeometryTransitionState.NORMAL) {
            this._updateNormalUntilScheduleBoundary(presentationDt);
            return;
        }
        this._updateGeometryTransition(presentationDt);
        this.setSimulationTimeScale(getWorldSimulationScale(this.geometry));
        // Player control remains responsive while the world slows or freezes.
        movePlayerAgainstWalls(this.player, presentationDt * this.time.playerScale, this._input, this.obstacles.walls);
        this._updateWorld(presentationDt * this.time.simulationScale, presentationDt);
    }
    _updateNormalUntilScheduleBoundary(presentationDt) {
        this.setSimulationTimeScale(1);
        const normalDt = Math.min(presentationDt, getGeometryScheduleRemaining(this.geometry));
        movePlayerAgainstWalls(this.player, normalDt * this.time.playerScale, this._input, this.obstacles.walls);
        if (!this._updateWorld(normalDt))
            return;
        const scheduleExpired = advanceGeometrySchedule(this.geometry, normalDt);
        if (!scheduleExpired)
            return;
        // Wall generation through the exact schedule boundary consumes RNG first.
        this.requestGeometryTransition(this.generator.nextGeometry(this.geometry.sideCount));
        const warningDt = presentationDt - normalDt;
        if (warningDt <= 0)
            return;
        this._updateGeometryTransition(warningDt);
        this.setSimulationTimeScale(getWorldSimulationScale(this.geometry));
        movePlayerAgainstWalls(this.player, warningDt * this.time.playerScale, this._input, this.obstacles.walls);
        this._updateWorld(warningDt * this.time.simulationScale, warningDt);
    }
    _updateWorld(worldDt, rotationDt = worldDt) {
        addScore(this.score, worldDt);
        const diffEnabled = this.mode !== GameMode.TRAINING;
        const previousStage = this.diff.stage;
        this.diff = computeDifficulty(this.score.value, diffEnabled);
        if (this.diff.stage !== previousStage) {
            this._onEvent?.({ type: 'difficulty-stage-changed', stage: this.diff.stage });
        }
        this._openingElapsed += worldDt;
        const openingScale = this._quickStart ? openingSpeedScale(this._openingElapsed) : 1;
        // Rotation shares the active presentation clock with player control and morph,
        // even when inward wall travel is slowed/frozen. Pause still executes no ticks.
        advanceWorldRotation(this.world, rotationDt, this.diff.rotationSpeed * openingScale, this.diff.t);
        if (this.sequenceRunner) {
            this.obstacles.spawnTimer = 0;
            const sequenceWall = this.sequenceRunner.update(worldDt, {
                walls: this.obstacles.walls,
                layout: this.layout,
                activeSideCount: this.geometry.sideCount,
                geometryTransitionState: this.geometry.transition.state,
            });
            if (sequenceWall)
                this.obstacles.walls.push(sequenceWall);
        }
        else if (!this.closedRevealDemo) {
            this.episodeCoordinator.update(worldDt, {
                obstacles: this.obstacles,
                layout: this.layout,
                sideCount: this.geometry.sideCount,
                transitionState: this.geometry.transition.state,
                difficulty: this.diff,
                generator: this.generator,
                spawnWall: () => this._spawnWall(),
            });
        }
        else {
            this.obstacles.spawnTimer += worldDt;
            const canSpawn = !this.closedRevealDemo || (this.obstacles.walls.length === 0
                && this.geometry.transition.state === GeometryTransitionState.NORMAL);
            if (!canSpawn)
                this.obstacles.spawnTimer = 0;
            if (canSpawn && this.obstacles.spawnTimer + 1e-9 >= this.diff.spawnEvery) {
                this.obstacles.spawnTimer = 0;
                this._spawnWall();
            }
        }
        // wallSpeed from difficulty.ts is in reference px/s (tuned at FullHD, 1080p).
        // Multiply by layout.unit so walls traverse the same relative playfield distance
        // at every display resolution — otherwise 4K walls would crawl while 720p walls rush.
        const scaledWallSpeed = this.diff.wallSpeed * this.layout.unit * openingScale;
        for (const w of this.obstacles.walls) {
            if (w.choreography) {
                updateChoreographedWall(w, scaledWallSpeed, worldDt, this.layout);
            }
            else {
                moveWall(w, scaledWallSpeed, worldDt);
            }
        }
        this.obstacles.walls = this.obstacles.walls.filter(w => !isWallDead(w));
        if (checkCollision(this.player, this.obstacles.walls)) {
            this.state = GameState.GAME_OVER;
            this.record.submitScore(this.score.value, this.mode);
            cancelGeometryTransition(this.geometry);
            this.presentation.geometryMorph = null;
            this.setSimulationTimeScale(1);
            return false;
        }
        return true;
    }
    _spawnWall() {
        if (this.closedRevealDemo) {
            this.obstacles.walls.push(createClosedRevealWall(this.layout, this.geometry.sideCount));
            return;
        }
        const def = this.generator.nextWall(this.diff.t);
        // Generator-supplied thickness is treated as a reference-resolution (1080p) value
        // and scaled by unit. Omitting thickness falls back to the layout default.
        const thickness = def.thickness != null
            ? def.thickness * this.layout.unit
            : this.layout.wallThickness;
        this.obstacles.walls.push(createWall({
            radius: this.layout.spawnRadius,
            thickness,
            segments: def.segments,
        }, this.geometry.sideCount));
    }
    _reset() {
        this._openingElapsed = 0;
        this.clock.pendingTicks = 0;
        this.clock.droppedSeconds = 0;
        this.state = GameState.RUNNING;
        resetWorldRotation(this.world);
        this.obstacles.walls = [];
        this.obstacles.spawnTimer = 0;
        this.diff = computeDifficulty(0);
        resetPlayer(this.player);
        resetScore(this.score);
        this.generator.reset();
        this.episodeCoordinator.reset();
        this._initializeRunGeometry();
        if (!this._explicitSequence) {
            const exercise = this.mode === GameMode.TRAINING
                ? TRAINING_EXERCISES[this._practiceIndex].sequence : null;
            this.sequenceRunner = exercise ? createSequenceRunner(exercise, this.geometry.sideCount) : null;
        }
        if (this.sequenceRunner)
            this.sequenceRunner.reset(this.geometry.sideCount);
        cancelGeometryTransition(this.geometry);
        this.presentation.geometryMorph = null;
        this.setSimulationTimeScale(1);
        if (this._quickStart && this.sequenceRunner) {
            primeSequenceOpening(this.sequenceRunner, this.obstacles, this.layout, this.geometry.sideCount, this.diff);
        }
        else if (this._quickStart && !this.closedRevealDemo) {
            const count = primeOpeningWave(this.obstacles, this.layout, this.geometry.sideCount, this.diff, () => this._spawnWall());
            this.episodeCoordinator.reset(count);
        }
        this.presentation.geometryNotice = createGeometryNotice();
        this._onEvent?.({ type: 'run-started' });
    }
    _initializeRunGeometry() {
        const generator = this.generator;
        const seededStart = generator.nextInitialGeometry?.();
        if (seededStart !== undefined) {
            // Explicit development overrides still consume the initial draw. Ordinary
            // SEEDED runs use the seed-selected geometry, including after game over.
            this.geometry.sideCount = this._seededSideCountOverride ?? seededStart;
        }
        generator.setSideCount(this.geometry.sideCount);
    }
    _updateGeometryTransition(dt) {
        // Keep the isolated reveal wall on one polygon until it has passed the center.
        const wallChoreographyActive = this.obstacles.walls.some(wall => wall.choreography);
        const sequenceActive = (this.sequenceRunner?.isGeometryLocked() ?? false)
            || this.episodeCoordinator.isGeometryLocked();
        const localGeometryLock = wallChoreographyActive || sequenceActive;
        // smoothstep averages to 0.5 over the slowdown, so this estimates where
        // each wall will be when the geometry is ready to apply.
        const slowdownTravel = this.diff.wallSpeed
            * this.layout.unit
            * this.geometry.transition.config.slowdownDuration
            * 0.5;
        const clearance = this.layout.geometryTransitionClearance;
        const canBeginSlowdown = hasGeometryTransitionClearance(this.obstacles.walls, this.player.radius, clearance, slowdownTravel, this.geometry.transition.targetSideCount ?? this.geometry.sideCount) && !localGeometryLock;
        const canApply = hasGeometryTransitionClearance(this.obstacles.walls, this.player.radius, clearance, 0, this.geometry.transition.targetSideCount ?? this.geometry.sideCount) && !localGeometryLock;
        const { startedFreeze, shouldApply } = advanceGeometryTransition(this.geometry, dt, {
            canBeginSlowdown,
            canApply,
        });
        if (startedFreeze)
            this._prepareGeometryMorph();
        const morph = this.presentation.geometryMorph;
        if (morph && this.geometry.transition.state === GeometryTransitionState.FREEZE) {
            morph.progress = smoothstep01(this.geometry.transition.freezeProgress);
        }
        if (morph && this.geometry.transition.state === GeometryTransitionState.RECOVERY) {
            this.presentation.geometryMorph = null;
        }
        if (!shouldApply)
            return;
        const targetSideCount = this.geometry.transition.targetSideCount;
        if (!morph || morph.targetSideCount !== targetSideCount) {
            throw new Error('Geometry APPLY requires a prepared presentation morph.');
        }
        if (morph.walls.length !== this.obstacles.walls.length) {
            throw new Error('Wall collection changed during frozen geometry morph.');
        }
        const remappedWalls = this.obstacles.walls.map((wall, index) => {
            const targetSegments = morph.walls[index].targetSegments;
            return createWall({ ...wall, segments: targetSegments }, targetSideCount, { requireGap: targetSegments.includes(0) });
        });
        // All fallible preparation happens before any authoritative state changes.
        if (this.generator)
            this.generator.setSideCount(targetSideCount);
        this.obstacles.walls = remappedWalls;
        // Atomic gameplay boundary at 50% visual morph: collision used the source
        // walls before this call and uses these target walls later in this frame.
        completeGeometryTransition(this.geometry);
        morph.applied = true;
        confirmGeometryNotice(this.presentation.geometryNotice, targetSideCount);
        this._onEvent?.({ type: 'geometry-applied', sideCount: targetSideCount });
    }
    _prepareGeometryMorph() {
        const sourceSideCount = this.geometry.sideCount;
        const targetSideCount = this.geometry.transition.targetSideCount;
        const targetWalls = remapWallsGeometry(this.obstacles.walls, targetSideCount);
        this.presentation.geometryMorph = {
            sourceSideCount,
            targetSideCount,
            progress: 0,
            applied: false,
            walls: targetWalls.map((targetWall, index) => ({
                sourceSideCount: this.obstacles.walls[index].sideCount,
                targetSideCount,
                sourceSegments: this.obstacles.walls[index].segments.slice(),
                targetSegments: targetWall.segments.slice(),
            })),
        };
    }
    _automaticGeometryEnabled() {
        return this.mode === GameMode.RANDOM || this.mode === GameMode.SEEDED;
    }
}
