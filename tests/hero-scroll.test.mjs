import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampProgress,
  deriveScrollMetrics,
  progressFromScroll,
  resolveMediaState,
  scrollStateFromScroll,
  timeFromProgress
} from '../hero-scroll.js';

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
