/* Floating navigation state — hysteresis so the paper bar never thrashes
 * at the threshold. Pure and DOM-free for node tests; app.js owns the wiring. */
export const NAV_FLOAT_ENTER = 64;
export const NAV_FLOAT_EXIT = 24;

export function navFloatState(scrollY, floating) {
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  return floating ? y > NAV_FLOAT_EXIT : y > NAV_FLOAT_ENTER;
}

export function initNavFloat(shell) {
  if (!shell) return;
  let floating = false;
  let ticking = false;

  const apply = () => {
    ticking = false;
    const next = navFloatState(window.scrollY, floating);
    if (next === floating) return;
    floating = next;
    shell.classList.toggle('is-floating', floating);
  };

  const requestApply = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', requestApply, { passive: true });
  window.addEventListener('resize', requestApply);
  apply();
}
