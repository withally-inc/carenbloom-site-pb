(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = Math.max(window.scrollY, 0);
    const delta = y - lastY;

    if (y < 80 || delta < -2) {
      header.classList.remove('is-nav-hidden');
    } else if (y > 120 && delta > 2) {
      header.classList.add('is-nav-hidden');
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
})();
