import { createWall, validateWallSegments } from '../entities/wall.js';
import { createClosedRevealWall, WallLifecycle, } from '../entities/wallChoreography.js';
import { getOuterWallRadius } from '../geometry/polygonRing.js';
import { PATTERNS, rotate } from '../generators/patterns.js';
const NORMAL_GEOMETRY_STATE = 'NORMAL';
export function createSequenceRunner(sequence, initialSideCount, { repeat = true } = {}) {
    let sideCount = initialSideCount;
    let activeSequence = validateSequence(sequence, initialSideCount);
    let entryIndex = 0;
    let spacingRemaining = 0;
    let blockingWall = null;
    let waitingForChoreography = false;
    let waitingForClearance = false;
    let completed = false;
    let completionElapsed = 0;
    let cycle = 1;
    return {
        update(dt, { walls, layout, activeSideCount, geometryTransitionState }) {
            if (!Number.isFinite(dt) || dt < 0)
                throw new Error(`Invalid sequence dt: ${dt}`);
            if (completed) {
                if (!repeat)
                    return null;
                completionElapsed += dt;
                if (completionElapsed >= activeSequence.replayDelay
                    && geometryTransitionState === NORMAL_GEOMETRY_STATE) {
                    beginCycle(activeSideCount, cycle + 1);
                }
                else {
                    return null;
                }
            }
            if (activeSideCount !== sideCount) {
                throw new Error(`Sequence ${sequence.name} changed geometry from ${sideCount} to ${activeSideCount}.`);
            }
            if (blockingWall && !hasChoreographyResumed(blockingWall)) {
                waitingForChoreography = true;
                return null;
            }
            blockingWall = null;
            waitingForChoreography = false;
            if (entryIndex >= activeSequence.entries.length) {
                const hasSequenceWalls = walls.some(isCurrentSequenceWall);
                if (!hasSequenceWalls)
                    completed = true;
                return null;
            }
            spacingRemaining = Math.max(0, spacingRemaining - dt);
            if (spacingRemaining > 0)
                return null;
            if (!hasSpawnClearance(walls, layout, sideCount)) {
                waitingForClearance = true;
                return null;
            }
            waitingForClearance = false;
            const currentIndex = entryIndex;
            const entry = activeSequence.entries[currentIndex];
            const wall = createSequenceWall(entry, layout, sideCount);
            wall.sequence = {
                name: sequence.name,
                variantSideCount: activeSequence.variantSideCount ?? null,
                entryIndex: currentIndex,
                role: entry.role,
                cycle,
            };
            entryIndex++;
            spacingRemaining = entry.spacing;
            if (wall.choreography)
                blockingWall = wall;
            return wall;
        },
        reset(nextSideCount = sideCount) {
            beginCycle(nextSideCount, 1);
        },
        isGeometryLocked() {
            return !completed;
        },
        getStatus() {
            return {
                name: sequence.name,
                variantSideCount: activeSequence.variantSideCount ?? null,
                entryIndex,
                entryCount: activeSequence.entries.length,
                spacingRemaining,
                waitingForChoreography,
                waitingForClearance,
                completed,
                cycle,
            };
        },
    };
    function beginCycle(nextSideCount, nextCycle) {
        activeSequence = validateSequence(sequence, nextSideCount);
        sideCount = nextSideCount;
        entryIndex = 0;
        spacingRemaining = 0;
        blockingWall = null;
        waitingForChoreography = false;
        waitingForClearance = false;
        completed = false;
        completionElapsed = 0;
        cycle = nextCycle;
    }
    function isCurrentSequenceWall(wall) {
        return wall.sequence?.name === sequence.name && wall.sequence.cycle === cycle;
    }
}
export function validateSequence(sequence, sideCount) {
    if (!sequence || typeof sequence.name !== 'string' || sequence.name.length === 0) {
        throw new Error('Sequence requires a name.');
    }
    const activeSequence = resolveSequenceVariant(sequence, sideCount);
    if (activeSequence.name !== sequence.name) {
        throw new Error(`Sequence variant name must match ${sequence.name}.`);
    }
    if (!Number.isFinite(activeSequence.replayDelay) || activeSequence.replayDelay < 0) {
        throw new Error(`Sequence ${activeSequence.name} has an invalid replay delay.`);
    }
    if (!Array.isArray(activeSequence.entries) || activeSequence.entries.length === 0) {
        throw new Error(`Sequence ${activeSequence.name} requires at least one entry.`);
    }
    if (activeSequence.variantSideCount !== undefined
        && activeSequence.variantSideCount !== sideCount) {
        throw new Error(`Sequence ${activeSequence.name} variant ${activeSequence.variantSideCount} `
            + `cannot run with ${sideCount} sides.`);
    }
    activeSequence.entries.forEach((entry, index) => {
        if (!Number.isFinite(entry.spacing) || entry.spacing < 0) {
            throw new Error(`Sequence ${activeSequence.name} entry ${index} has invalid spacing.`);
        }
        if (entry.thickness !== undefined && (!Number.isFinite(entry.thickness) || entry.thickness <= 0)) {
            throw new Error('Sequence thickness must be finite and positive.');
        }
        if (entry.role !== undefined && entry.role !== 'barrier')
            throw new Error('Unknown wall role.');
        resolvePattern(entry.pattern, entry.rotation, sideCount, {
            requireGap: entry.pattern !== 'CLOSED',
        });
        if (!entry.choreography) {
            if (entry.pattern === 'CLOSED') {
                throw new Error(`Sequence ${sequence.name} entry ${index} closes without choreography.`);
            }
            return;
        }
        if (entry.choreography.type !== 'CLOSED_REVEAL') {
            throw new Error(`Unsupported sequence choreography: ${entry.choreography.type}`);
        }
        if (entry.pattern !== 'CLOSED') {
            throw new Error(`Sequence ${sequence.name} entry ${index} must use CLOSED with CLOSED_REVEAL choreography.`);
        }
        resolvePattern(entry.choreography.revealPattern, entry.choreography.revealRotation, sideCount, { requireGap: true });
    });
    return activeSequence;
}
export function resolveSequenceVariant(sequence, sideCount) {
    if (!sequence?.variants)
        return sequence;
    const variant = sequence.variants[sideCount];
    if (!variant) {
        throw new Error(`Sequence ${sequence.name} has no ${sideCount}-side variant.`);
    }
    return variant;
}
export function resolvePattern(patternName, rotation, sideCount, { requireGap = true } = {}) {
    if (!Number.isInteger(rotation)) {
        throw new Error(`Pattern ${patternName} requires an integer rotation.`);
    }
    const canonical = patternName === 'CLOSED'
        ? Array(sideCount).fill(1)
        : PATTERNS[sideCount]?.[patternName];
    if (!canonical) {
        throw new Error(`Pattern ${patternName} is unavailable for ${sideCount} sides.`);
    }
    // Keep authored rotations valid when a completed sequence replays after a
    // global side-count transition, even if the offset exceeds the new polygon.
    const normalizedRotation = ((rotation % canonical.length) + canonical.length)
        % canonical.length;
    const segments = rotate(canonical, normalizedRotation);
    validateWallSegments(segments, sideCount, { requireGap });
    return segments;
}
function createSequenceWall(entry, layout, sideCount) {
    const thickness = entry.thickness == null
        ? layout.wallThickness
        : entry.thickness * layout.unit;
    const segments = resolvePattern(entry.pattern, entry.rotation, sideCount, {
        requireGap: entry.pattern !== 'CLOSED',
    });
    if (entry.choreography?.type === 'CLOSED_REVEAL') {
        const revealSegments = resolvePattern(entry.choreography.revealPattern, entry.choreography.revealRotation, sideCount, { requireGap: true });
        return createClosedRevealWall(layout, sideCount, { thickness, revealSegments });
    }
    return createWall({
        radius: layout.spawnRadius,
        thickness,
        segments,
    }, sideCount);
}
function hasChoreographyResumed(wall) {
    const event = wall.choreography;
    return event?.revealed === true && event.state === WallLifecycle.APPROACHING;
}
function hasSpawnClearance(walls, layout, sideCount) {
    const spawnInnerFace = layout.spawnRadius * Math.cos(Math.PI / sideCount);
    return walls.every(wall => {
        if (wall.sequence?.role === 'barrier')
            return true;
        const outerFace = getOuterWallRadius(wall.radius, wall.thickness, wall.sideCount) * Math.cos(Math.PI / wall.sideCount);
        return spawnInnerFace - outerFace >= layout.sequenceMinWallSeparation;
    });
}
