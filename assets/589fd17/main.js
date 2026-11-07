import { createKeyboardControls } from './adapters/keyboard.js';
import { createBestScoreRecord } from './systems/record.js';
import { loadBestScore, saveBestScore, loadLegacyBestScore } from './utils/storage.js';
import { Game } from './game/Game.js';
import { startLoop } from './game/loop.js';
import { DEBUG_GEOMETRY_TRANSITION_CONFIG } from './game/geometryTransition.js';
import { resolveSequenceDemo } from './sequences/practiceSequences.js';
import { SEQUENCE_CATALOGUE } from './sequences/sequenceCatalogue.js';
import { getSequenceEligibility, selectSequence } from './sequences/sequenceSelection.js';
import { render } from './render/renderer.js';
import { resolvePalette } from './render/palettes.js';
import { createPresentationDirector } from './presentation/presentationDirector.js';
import { GameState } from './game/GameState.js';
import { createAudioEngine } from './audio/audioEngine.js';
import { createFrameProfile } from './adapters/frameProfile.js';
import { mountPlaytestControls } from './adapters/playtestControls.js';
import { mountAudioControls } from './adapters/audioControls.js';
import { createInputFrame, EMPTY_INPUT_FRAME } from './systems/input.js';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const profileOutput = params.has('profile') ? document.getElementById('frame-profile') : null;
if (profileOutput)
    profileOutput.hidden = false;
const profiler = createFrameProfile(profileOutput);
let frameSeconds = 0;
let updateMilliseconds = 0;
const seed = params.get('seed'); // null → user picks mode on start screen
let audioUI;
const audio = createAudioEngine({ onStatusChange: () => audioUI?.refresh() });
const director = createPresentationDirector(resolvePalette(params.get('palette')), {
    automatic: params.get('paletteMode') !== 'manual',
    scheduleCue: audio.scheduleCue,
});
const sideCount = params.get('sides');
const geometryTransitionConfig = params.has('debug') && params.has('fastTransitions')
    ? DEBUG_GEOMETRY_TRANSITION_CONFIG
    : undefined;
const closedRevealDemo = params.has('debug') && params.has('closedReveal');
const sequence = params.has('debug')
    ? resolveSequenceDemo(params.get('sequenceDemo'))
    : null;
const controls = createKeyboardControls(window, params.has('debug'));
const record = createBestScoreRecord({ load: loadBestScore, save: saveBestScore });
const game = new Game({
    record,
    onEvent(event) {
        director.handleEvent(event);
        if (event.type === 'run-started') {
            audio.restart();
            profiler.reset();
        }
    },
    seed,
    sideCount,
    geometryTransitionConfig,
    closedRevealDemo: closedRevealDemo && !sequence,
    sequence,
    episodes: params.has('debug') && params.has('episodes'),
});
window.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey)
        return;
    if (event.code === 'Space' || event.code === 'Escape')
        audio.activate();
    if (event.code === 'KeyP')
        director.selectNextPalette(game.state === GameState.RUNNING);
    if (event.code === 'KeyO')
        director.toggleAutomatic();
});
function syncAudioState() {
    audio.setState(game.state === GameState.RUNNING ? 'running'
        : game.state === GameState.PAUSED ? 'paused' : 'stopped');
}
let resumeAfterAudioSettings = false;
audioUI = mountAudioControls(document, audio, () => {
    resumeAfterAudioSettings = game.state === GameState.RUNNING;
    controls.clear();
    game.handleBackgrounding();
    syncAudioState();
}, () => {
    controls.clear();
    if (resumeAfterAudioSettings && game.state === GameState.PAUSED && !document.hidden) {
        game.update(0, createInputFrame({ advance: true }));
        syncAudioState();
    }
    resumeAfterAudioSettings = false;
    canvas.focus({ preventScroll: true });
});
audioUI.refresh();
const playtestUI = mountPlaytestControls(document, game, {
    start() { controls.clear(); audio.activate(); game.update(0, createInputFrame({ advance: true })); syncAudioState(); },
    resume() { controls.clear(); audio.activate(); game.update(0, createInputFrame({ advance: true })); syncAudioState(); },
    returnToMenu() { controls.clear(); game.returnToMenu(); syncAudioState(); },
    focusGame() { controls.clear(); canvas.focus({ preventScroll: true }); },
    clearInput() { controls.clear(); },
    copy(text) { return navigator.clipboard.writeText(text); },
    href() { return window.location.href; },
}, loadLegacyBestScore());
if (params.has('debug')) {
    window.inspectEpisodes = () => game.episodeCoordinator.getStatus();
    window.inspectSequenceCatalogue = ({ count = 8, sideCount = game.geometry.sideCount, difficulty = game.diff.t, rng = Math.random, } = {}) => {
        if (!Number.isInteger(count) || count < 1 || count > 100) {
            throw new Error('Inspector count must be an integer from 1 to 100.');
        }
        const eligibility = getSequenceEligibility({
            catalogue: SEQUENCE_CATALOGUE, sideCount, difficulty,
        });
        const selections = [];
        let previousSequenceId = null;
        for (let index = 0; index < count; index++) {
            const selected = selectSequence({
                catalogue: SEQUENCE_CATALOGUE, sideCount, difficulty, rng, previousSequenceId,
            });
            if (!selected)
                break;
            selections.push(selected.id);
            previousSequenceId = selected.id;
        }
        console.info(`Sequence catalogue: ${sideCount} sides, difficulty ${difficulty.toFixed(3)}`);
        console.table(eligibility.map(({ entry, reasons }) => ({
            id: entry.id,
            weight: entry.weight,
            status: reasons.length ? reasons.join(', ') : 'eligible',
        })));
        console.info('Selected ids:', selections);
        return { sideCount, difficulty, eligibility, selections };
    };
}
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    game.resize(canvas);
}
window.addEventListener('resize', resize);
window.addEventListener('blur', () => {
    controls.clear();
    game.handleBackgrounding();
    syncAudioState();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        controls.clear();
        game.handleBackgrounding();
        syncAudioState();
    }
});
resize(); // sets canvas size and computes initial layout before the first frame
startLoop({
    update: dt => {
        const started = profileOutput ? performance.now() : 0;
        frameSeconds = dt;
        audio.update();
        let input = controls.readFrame();
        if (game.state === GameState.START && input.advance && !audioUI?.isOpen
            && !playtestUI.ownsKeyboard && !playtestUI.prepareStart())
            input = { ...input, advance: false };
        game.update(dt, audioUI?.isOpen || playtestUI.ownsKeyboard ? EMPTY_INPUT_FRAME : input);
        playtestUI.refresh(audioUI?.isOpen ?? false);
        syncAudioState();
        if (profileOutput)
            updateMilliseconds = performance.now() - started;
    },
    render: (context, size) => {
        const started = profileOutput ? performance.now() : 0;
        render(context, size, game, controls.isDebugEnabled(), director.palette, director.automatic, playtestUI.mounted);
        if (profileOutput && game.state === GameState.RUNNING) {
            profiler.record(frameSeconds, updateMilliseconds, performance.now() - started, game.clock.droppedSeconds);
        }
    },
}, ctx, canvas);
