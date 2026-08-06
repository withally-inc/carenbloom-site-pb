export function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function progressFromScroll(scrollY, pinStart, scrubDistance) {
  if (!Number.isFinite(scrubDistance) || scrubDistance <= 0) return 0;
  return clampProgress((scrollY - pinStart) / scrubDistance);
}

export function deriveScrollMetrics(totalDistance, preferredScrubDistance, reduced = false) {
  if (reduced) return { scrubDistance: 0, holdDistance: 0 };
  const total = Number.isFinite(totalDistance) ? Math.max(0, totalDistance) : 0;
  const preferred = Number.isFinite(preferredScrubDistance) ? Math.max(0, preferredScrubDistance) : 0;
  const scrubDistance = Math.min(total, preferred);
  return { scrubDistance, holdDistance: Math.max(0, total - scrubDistance) };
}

export function scrollStateFromScroll(scrollY, pinStart, scrubDistance, holdDistance = 0) {
  const local = scrollY - pinStart;
  const hold = Number.isFinite(holdDistance) ? Math.max(0, holdDistance) : 0;
  const progress = progressFromScroll(scrollY, pinStart, scrubDistance);
  if (local < 0) return { progress, phase: 'before' };
  if (local < scrubDistance) return { progress, phase: 'scrub' };
  if (hold > 0 && local <= scrubDistance + hold) return { progress: 1, phase: 'hold' };
  return { progress, phase: 'after' };
}

export function timeFromProgress(progress, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clampProgress(progress) * duration;
}

export function resolveMediaState({ reduced, failed, metadataReady, frameReady, progress }) {
  if (reduced) return 'reduced';
  if (failed) return 'fallback';
  const p = clampProgress(progress);
  if (p === 0) return 'start';
  if (p === 1) return 'end';
  if (!metadataReady || !frameReady) return 'loading';
  return 'video';
}

/* ---------- the opening: the page does not arrive fully formed ---------- */

/* Each card earns its entrance at its own slice of the hero scrub: card 1 at 4% of the
   scrub (~40px of the 1000px interval — the first nudge of the wheel), then one more card
   every 7%. Every threshold sits well before that card's own face-flip slice
   (0.15 + d * 0.13 in app.js), so a card is always standing before its score turns over. */
export function chipRevealCount(progress, chipCount, first = 0.04, step = 0.07) {
  if (!Number.isInteger(chipCount) || chipCount <= 0) return 0;
  const p = clampProgress(progress) + 1e-9; // an exact threshold counts as crossed despite float accumulation
  let count = 0;
  while (count < chipCount && p >= first + count * step) count += 1;
  return count;
}

/* The full ceremony (blank art side, wordmark beat, slow emergence, scroll-earned cards)
   belongs only to a fresh landing at the top of the page. Reduced motion keeps everything
   present at rest; a restored scroll position, deep anchor, or a script that starts long
   after first paint prints the already-earned state immediately instead of re-performing. */
export function resolveOpeningMode({ reduced, restoredScroll, lateStart }) {
  if (reduced) return 'reduced';
  if (restoredScroll || lateStart) return 'settled';
  return 'ceremony';
}
