export function validateSeed(seed) {
    if (!seed.trim() || seed.length > 128)
        throw new Error('Podaj seed od 1 do 128 znaków.');
    return seed; // Preserve spelling, Unicode and spaces: they are part of the seed.
}
export function createChallengeLink(href, seed, buildId) {
    const source = new URL(href);
    const link = new URL(source.href);
    link.search = '';
    link.hash = '';
    link.searchParams.set('seed', validateSeed(seed));
    link.searchParams.set('v', buildId);
    // Keep gameplay overrides so a development challenge does not silently change
    // its rules. Discard cosmetic settings, profiling, fragments and unknown data.
    if (source.searchParams.has('sides'))
        link.searchParams.set('sides', source.searchParams.get('sides'));
    if (source.searchParams.has('debug')) {
        for (const key of ['fastTransitions', 'episodes', 'closedReveal', 'sequenceDemo']) {
            if (source.searchParams.has(key)) {
                link.searchParams.set('debug', '');
                link.searchParams.set(key, source.searchParams.get(key));
            }
        }
    }
    return link.href;
}
