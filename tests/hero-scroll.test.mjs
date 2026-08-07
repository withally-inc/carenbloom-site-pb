import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chipRevealCount,
  clampProgress,
  deriveScrollMetrics,
  progressFromScroll,
  resolveMediaState,
  resolveOpeningMode,
  shouldLoadHeroVideo,
  scrollStateFromScroll,
  timeFromProgress
} from '../hero-scroll.js';

test('mobile and constrained visitors keep the hero stills without downloading video', () => {
  const fastDesktop = { reduced: false, viewportWidth: 1440, saveData: false, effectiveType: '4g' };
  assert.equal(shouldLoadHeroVideo(fastDesktop), true);
  assert.equal(shouldLoadHeroVideo({ ...fastDesktop, viewportWidth: 390 }), false);
  assert.equal(shouldLoadHeroVideo({ ...fastDesktop, saveData: true }), false);
  assert.equal(shouldLoadHeroVideo({ ...fastDesktop, effectiveType: '3g' }), false);
  assert.equal(shouldLoadHeroVideo({ ...fastDesktop, reduced: true }), false);
});

test('progress clamps below and above the hero interval', () => {
  assert.equal(clampProgress(-0.5), 0);
  assert.equal(clampProgress(1.5), 1);
  assert.equal(progressFromScroll(500, 100, 1000), 0.4);
});

test('forward and reverse scroll positions map to the same deterministic time', () => {
  const duration = 4.041667;
  const forward = [0, 250, 500, 750, 1000].map(y =>
    timeFromProgress(progressFromScroll(y, 0, 1000), duration)
  );
  const reverse = [1000, 750, 500, 250, 0].map(y =>
    timeFromProgress(progressFromScroll(y, 0, 1000), duration)
  );
  assert.deepEqual(reverse, [...forward].reverse());
});

test('reduced motion always resolves to the final stable still', () => {
  assert.equal(resolveMediaState({ reduced: true, failed: false, metadataReady: false, frameReady: false, progress: 0 }), 'reduced');
});

test('metadata-not-ready motion keeps a real poster visible', () => {
  assert.equal(resolveMediaState({ reduced: false, failed: false, metadataReady: false, frameReady: false, progress: 0.5 }), 'loading');
});

test('load or seek failure resolves to the final still', () => {
  assert.equal(resolveMediaState({ reduced: false, failed: true, metadataReady: false, frameReady: false, progress: 0.5 }), 'fallback');
});

test('both endpoints use exact supplied stills', () => {
  const ready = { reduced: false, failed: false, metadataReady: true, frameReady: true };
  assert.equal(resolveMediaState({ ...ready, progress: 0 }), 'start');
  assert.equal(resolveMediaState({ ...ready, progress: 1 }), 'end');
  assert.equal(timeFromProgress(0, 4.041667), 0);
  assert.equal(timeFromProgress(1, 4.041667), 4.041667);
});

test('scrub progress reaches one before the separate final-state hold is consumed', () => {
  assert.deepEqual(scrollStateFromScroll(750, 0, 1000, 400), { progress: 0.75, phase: 'scrub' });
  assert.deepEqual(scrollStateFromScroll(1000, 0, 1000, 400), { progress: 1, phase: 'hold' });
  assert.deepEqual(scrollStateFromScroll(1200, 0, 1000, 400), { progress: 1, phase: 'hold' });
  assert.deepEqual(scrollStateFromScroll(1401, 0, 1000, 400), { progress: 1, phase: 'after' });
});

test('the exact final still owns arrival, midpoint, and end of the hold', () => {
  const ready = { reduced: false, failed: false, metadataReady: true, frameReady: true };
  for (const scrollY of [1000, 1200, 1400]) {
    const state = scrollStateFromScroll(scrollY, 0, 1000, 400);
    assert.equal(state.progress, 1);
    assert.equal(resolveMediaState({ ...ready, progress: state.progress }), 'end');
  }
});

test('reverse scrolling re-enters the hold before reversing the scrub', () => {
  const sequence = [
    scrollStateFromScroll(1401, 0, 1000, 400),
    scrollStateFromScroll(1400, 0, 1000, 400),
    scrollStateFromScroll(1200, 0, 1000, 400),
    scrollStateFromScroll(999, 0, 1000, 400)
  ];
  assert.deepEqual(sequence.map(state => state.phase), ['after', 'hold', 'hold', 'scrub']);
  assert.deepEqual(sequence.map(state => state.progress), [1, 1, 1, 0.999]);
});

test('reduced motion excludes both scrub pinning and artificial hold distance', () => {
  assert.deepEqual(deriveScrollMetrics(1400, 1000, true), { scrubDistance: 0, holdDistance: 0 });
  assert.deepEqual(deriveScrollMetrics(1400, 1000, false), { scrubDistance: 1000, holdDistance: 400 });
});

test('the opening: cards are earned by scroll progress, in order, none at rest', () => {
  assert.equal(chipRevealCount(0, 5), 0, 'a visitor who has not scrolled has earned no cards');
  assert.equal(chipRevealCount(0.039, 5), 0);
  assert.equal(chipRevealCount(0.04, 5), 1, 'the first nudge of the wheel earns card 1');
  assert.equal(chipRevealCount(0.1, 5), 1);
  assert.equal(chipRevealCount(0.11, 5), 2);
  assert.equal(chipRevealCount(0.32, 5), 5, 'the full set is standing by a third of the scrub');
  assert.equal(chipRevealCount(1, 5), 5);
});

test('the opening: reveal counts clamp against malformed progress and card counts', () => {
  assert.equal(chipRevealCount(-1, 5), 0);
  assert.equal(chipRevealCount(2, 5), 5);
  assert.equal(chipRevealCount(NaN, 5), 0);
  assert.equal(chipRevealCount(0.5, 0), 0);
  assert.equal(chipRevealCount(0.5, 2.5), 0);
});

test('every card is standing before its own face flip begins', () => {
  for (let d = 0; d < 5; d += 1) {
    const revealAt = 0.04 + d * 0.07;          // chipRevealCount defaults
    const flipStartsAt = 0.15 + d * 0.13;      // the inherited --pc choreography in app.js
    assert.ok(revealAt < flipStartsAt, `card ${d + 1} must be revealed (${revealAt}) before it flips (${flipStartsAt})`);
  }
});

test('the opening ceremony belongs only to a fresh landing at the top', () => {
  assert.equal(resolveOpeningMode({ reduced: true, restoredScroll: false, lateStart: false }), 'reduced');
  assert.equal(resolveOpeningMode({ reduced: false, restoredScroll: true, lateStart: false }), 'settled');
  assert.equal(resolveOpeningMode({ reduced: false, restoredScroll: false, lateStart: true }), 'settled');
  assert.equal(resolveOpeningMode({ reduced: false, restoredScroll: false, lateStart: false }), 'ceremony');
});
