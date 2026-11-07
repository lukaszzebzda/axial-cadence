import { GameMode } from '../game/GameMode.js';
import { GameState } from '../game/GameState.js';
import { TRAINING_EXERCISES } from '../sequences/trainingExercises.js';
import { BUILD_ID } from '../game/buildInfo.js';
import { createChallengeLink, validateSeed } from './challengeLink.js';
export function mountPlaytestControls(document, game, actions, legacyBestScore = 0) {
    const element = document.getElementById('playtest-panel');
    if (!element)
        return { mounted: false, ownsKeyboard: false, prepareStart: () => true, refresh(_audioSettingsOpen = false) { } };
    const panel = element;
    const find = (selector) => panel.querySelector(selector);
    const menu = find('[data-start-menu]');
    const result = find('[data-result-actions]');
    const resume = find('[data-resume]');
    const returnButton = find('[data-menu-return]');
    const legacyBest = find('[data-legacy-best]');
    legacyBest.hidden = legacyBestScore <= 0;
    legacyBest.textContent = `Dawny rekord ogólny: ${legacyBestScore.toFixed(2)} s`;
    const mode = find('#game-mode');
    const seedRow = find('[data-seed-row]');
    const seed = find('#challenge-seed');
    const practiceRow = find('[data-practice-row]');
    const practice = find('#practice');
    const description = find('[data-mode-description]');
    const best = find('[data-menu-best]');
    const status = find('[data-share-status]');
    const fallback = find('[data-copy-fallback]');
    const resultSeed = find('[data-result-seed]');
    const sharing = find('[data-sharing]');
    const version = document.getElementById('build-version');
    const requestedBuild = new URL(actions.href()).searchParams.get('v');
    if (version)
        version.textContent = `Prototyp · ${BUILD_ID}`;
    seed.value = game.seed;
    for (const [index, exercise] of TRAINING_EXERCISES.entries()) {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = exercise.label;
        practice.append(option);
    }
    let previousState = game.state;
    let previousView = '';
    const clearStatus = () => { status.textContent = ''; fallback.hidden = true; };
    const configure = () => {
        game.configureStart({ mode: mode.value,
            seed: mode.value === GameMode.SEEDED ? validateSeed(seed.value) : game.seed,
            practiceIndex: Number(practice.value) });
    };
    const showError = (error) => { status.textContent = error instanceof Error ? error.message : 'Nie udało się wykonać operacji.'; };
    mode.addEventListener('change', () => {
        // Keep an unfinished seed edit when switching to a different mode.
        game.configureStart({ mode: mode.value });
        clearStatus();
        refresh();
    });
    practice.addEventListener('change', () => { game.configureStart({ practiceIndex: Number(practice.value) }); refresh(); });
    seed.addEventListener('input', () => {
        clearStatus();
        try {
            game.configureStart({ seed: validateSeed(seed.value) });
        }
        catch { /* Validate again on Start. */ }
    });
    function prepareStart() {
        try {
            configure();
            clearStatus();
            return true;
        }
        catch (error) {
            showError(error);
            return false;
        }
    }
    find('[data-start-form]').addEventListener('submit', event => {
        event.preventDefault();
        if (prepareStart()) {
            actions.start();
            refresh();
            actions.focusGame();
        }
    });
    resume.addEventListener('click', () => { actions.resume(); refresh(); actions.focusGame(); });
    returnButton.addEventListener('click', () => {
        actions.returnToMenu();
        refresh();
        actions.focusGame();
    });
    // Native text/select/button keys stay in the UI; they never become gameplay
    // commands (including P/O, debug digits and Space in the seed field).
    panel.addEventListener('focusin', () => actions.clearInput());
    panel.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape') {
            event.preventDefault();
            if (game.state === GameState.GAME_OVER)
                actions.returnToMenu();
            else if (game.state === GameState.PAUSED)
                actions.resume();
            refresh();
            actions.focusGame();
        }
    });
    panel.addEventListener('keyup', event => event.stopPropagation());
    for (const button of panel.querySelectorAll('[data-copy]')) {
        button.addEventListener('click', async () => {
            clearStatus();
            let value;
            try {
                const currentSeed = game.state === GameState.START ? validateSeed(seed.value) : game.seed;
                value = button.dataset.copy === 'seed' ? currentSeed : createChallengeLink(actions.href(), currentSeed, BUILD_ID);
            }
            catch (error) {
                showError(error);
                return;
            }
            try {
                await actions.copy(value);
                status.textContent = 'Skopiowano.';
            }
            catch {
                fallback.value = value;
                fallback.hidden = false;
                fallback.focus();
                fallback.select();
                status.textContent = 'Zaznaczony tekst możesz skopiować przez Ctrl+C.';
            }
        });
    }
    function refresh(audioSettingsOpen = false) {
        const view = `${game.state}|${game.mode}|${game.practiceIndex}|${game.bestScore}|${game.seed}|${audioSettingsOpen}`;
        if (view === previousView)
            return;
        previousView = view;
        const isStart = game.state === GameState.START;
        const isResult = game.state === GameState.GAME_OVER;
        const isPaused = game.state === GameState.PAUSED && !audioSettingsOpen;
        panel.hidden = !isStart && !isResult && !isPaused;
        panel.classList.toggle('result-panel', !isStart);
        menu.hidden = !isStart;
        result.hidden = isStart;
        resume.hidden = !isPaused;
        returnButton.textContent = isPaused ? 'Wróć do menu' : 'Wybierz tryb / zmień seed';
        if (previousState !== game.state)
            clearStatus();
        previousState = game.state;
        if (isStart) {
            mode.value = game.mode;
            practice.value = String(game.practiceIndex);
            seedRow.hidden = game.mode !== GameMode.SEEDED;
            practiceRow.hidden = game.mode !== GameMode.TRAINING;
            description.textContent = game.mode === GameMode.RANDOM ? 'Nowy układ przeszkód przy każdej próbie.'
                : game.mode === GameMode.SEEDED ? 'Ćwicz ten sam układ lub wyślij wyzwanie znajomym.' : 'Powtarzaj wybrane ćwiczenie w stałym tempie.';
            best.textContent = `Najlepszy wynik · ${game.mode}: ${game.bestScore.toFixed(2)} s`;
        }
        sharing.hidden = game.mode !== GameMode.SEEDED;
        resultSeed.textContent = game.mode === GameMode.SEEDED ? `Seed: ${game.seed}` : '';
        const mismatch = requestedBuild && requestedBuild !== BUILD_ID;
        find('[data-version-warning]').hidden = !mismatch;
        // Hidden controls must not keep swallowing Space after a keyboard start.
        if (panel.hidden && panel.contains(document.activeElement))
            actions.focusGame();
    }
    refresh();
    return { mounted: true, get ownsKeyboard() { return panel.contains(document.activeElement); }, prepareStart, refresh };
}
