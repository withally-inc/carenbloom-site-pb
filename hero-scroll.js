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
