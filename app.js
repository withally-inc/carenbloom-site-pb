import {
  deriveScrollMetrics,
  resolveMediaState,
  scrollStateFromScroll,
  timeFromProgress
} from './hero-scroll.js';

// Direction D6 — one pinned inversion, one reversible heading reveal (inherited, unchanged),
// plus the captain-approved Candidate 03 stepped lemon march on the evidence band (lemon-stopmotion-a1).
(function () {
  const pin = document.getElementById('heroPin');
  const stage = document.getElementById('heroStage');
  const chips = Array.from(document.querySelectorAll('.chip'));
  const statBands = Array.from(document.querySelectorAll('.stat-band'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const media = document.getElementById('heroMedia');
  const video = document.getElementById('heroGrowVideo');
  const PREFERRED_SCRUB_DISTANCE = 1000;
  let pinStart = 0;
  let pinHeight = 0;
  let scrubDistance = 0;
  let holdDistance = 0;
  let videoDuration = 0;
  let metadataReady = false;
  let frameReady = false;
  let videoFailed = false;
  let seekTimer = 0;
  let metadataTimer = 0;
  let ticking = false;

  function measureHero() {
    const rect = pin.getBoundingClientRect();
    pinStart = scrollY + rect.top;
    pinHeight = pin.offsetHeight;
    const metrics = deriveScrollMetrics(
      Math.max(0, pinHeight - stage.offsetHeight),
      PREFERRED_SCRUB_DISTANCE,
      reduced
    );
    scrubDistance = metrics.scrubDistance;
    holdDistance = metrics.holdDistance;
  }

  function failVideo() {
    videoFailed = true;
    metadataReady = false;
    frameReady = false;
    clearTimeout(seekTimer);
    clearTimeout(metadataTimer);
    media.dataset.state = 'fallback';
  }

  function seekVideo(p) {
    if (!metadataReady || videoFailed || !Number.isFinite(videoDuration)) return;
    const target = timeFromProgress(p, videoDuration);
    if (Math.abs(video.currentTime - target) < 0.012) return;
    try {
      video.currentTime = target;
      clearTimeout(seekTimer);
      seekTimer = setTimeout(failVideo, 1800);
    } catch {
      failVideo();
    }
  }

  function updateHero() {
    const viewportTop = scrollY;
    const viewportBottom = viewportTop + innerHeight;
    const pinBottom = pinStart + pinHeight;
    if (viewportBottom <= pinStart || viewportTop >= pinBottom) return;
    const scrollState = scrollStateFromScroll(viewportTop, pinStart, scrubDistance, holdDistance);
    const p = scrollState.progress;
    stage.dataset.scrollPhase = scrollState.phase;
    // foreground flip: smoothstep over the 0.45-0.75 slice of the interval
    const t = Math.min(1, Math.max(0, (p - 0.45) / 0.3));
    const pf = t * t * (3 - 2 * t);
    stage.style.setProperty('--p', p.toFixed(4));
    stage.style.setProperty('--pf', pf.toFixed(4));
    chips.forEach((chip, i) => {
      // staggered per-chip crossfade, each over its own tight slice of the interval
      const d = Number(chip.style.getPropertyValue('--d') || i);
      const start = 0.15 + d * 0.13;
      const pc = Math.min(1, Math.max(0, (p - start) / 0.22));
      chip.style.setProperty('--pc', pc.toFixed(4));
    });

    const mediaState = resolveMediaState({
      reduced,
      failed: videoFailed,
      metadataReady,
      frameReady,
      progress: p
    });
    media.dataset.state = mediaState;
    if (metadataReady) seekVideo(p);
  }

  /* Reference-matched stat reveal: normal document travel with a reversible
     scroll-linked colour layer and measured terminal scales of 1/.95/.70. */
  function bandRevealBezier(x) {
    const x1 = 0.25;
    const x2 = 0.4;
    let t = x;
    for (let i = 0; i < 6; i += 1) {
      const omt = 1 - t;
      const estimate = 3 * omt * omt * t * x1 + 3 * omt * t * t * x2 + t * t * t;
      const slope = 3 * omt * omt * x1 + 6 * omt * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(slope) < 0.0001) break;
      t -= (estimate - x) / slope;
    }
    const omt = 1 - t;
    return 3 * omt * t * t + t * t * t;
  }

  function updateStatBands() {
    if (reduced) return;
    const travel = innerHeight * 0.733;
    statBands.forEach((band) => {
      const raw = Math.min(1, Math.max(0, (innerHeight - band.getBoundingClientRect().top) / travel));
      band.style.setProperty('--band-reveal', bandRevealBezier(raw).toFixed(4));
    });
  }

  function update() {
    ticking = false;
    updateHero();
    updateStatBands();
  }

  function scheduleUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  if (reduced) {
    // No pin, no scrub: show the revealed record state at rest.
    stage.style.setProperty('--p', '1');
    stage.style.setProperty('--pf', '1');
    chips.forEach(c => c.style.setProperty('--pc', '1'));
    media.dataset.state = 'reduced';
  } else {
    video.addEventListener('loadedmetadata', () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        failVideo();
        return;
      }
      clearTimeout(metadataTimer);
      videoDuration = video.duration;
      metadataReady = true;
      scheduleUpdate();
    }, { once: true });
    video.addEventListener('seeked', () => {
      clearTimeout(seekTimer);
      frameReady = true;
      scheduleUpdate();
    });
    video.addEventListener('error', failVideo, { once: true });
    addEventListener('scroll', scheduleUpdate, { passive: true });
    addEventListener('resize', () => {
      measureHero();
      scheduleUpdate();
    });
    measureHero();
    scheduleUpdate();
    video.src = video.dataset.src;
    video.load();
    metadataTimer = setTimeout(failVideo, 8000);

    /* Arrival T0 composes beneath the shared GROW/colour/chip progress owner.
       The exact bud still replaces the old bloom image as the readiness asset. */
    const bud = stage.querySelector('.hero-frame-start');
    const heroReady = Promise.all([
      document.fonts.ready,
      new Promise(resolve => {
        if (!bud || bud.complete) return resolve();
        bud.addEventListener('load', resolve, { once: true });
        bud.addEventListener('error', resolve, { once: true });
      })
    ]);
    Promise.race([heroReady, new Promise(resolve => setTimeout(resolve, 1500))])
      .then(() => stage.classList.add('arrived'));
  }

  /* ---------- the record made physical: five stepped Candidate 03 lemons (captain-approved 2026-08-05) ----------
     Proof geometry (carenbloom-pb-lemon-stopmotion-a1): ten rotational keyframes held 200ms each
     (a 2s stepped turn), five lemons at phase offsets [0,2,4,6,8] so no two turn in synchrony,
     marching left-to-right at 0.5 band-widths per second (70px per 100ms frame on the 1400px
     proof canvas). One shared 3600×360 sprite carries all ten phases: a step is an
     object-position change (paint-only, no refetch), translation is delta-time based and
     transform-only, and the loop pauses offscreen and when the document is hidden. Under reduced
     motion nothing here runs: the markup's <picture> sources already show the static print
     master. If the sprite fails to load, the animation stands down and the page keeps the
     markup's static composition. */
  const lemonBand = document.getElementById('lemonBand');
  if (lemonBand && !reduced) {
    const lemons = Array.from(lemonBand.querySelectorAll('.lemon'));
    const imgs = lemons.map((lemon) => lemon.querySelector('img'));
    const SPRITE_SRC = 'assets/lemon-march/lemon-rotation-sprite.png';
    const PHASE_COUNT = 10;
    const PHASE_OFFSETS = [0, 2, 4, 6, 8];
    const START_FRACTIONS = [0, 250 / 1400, 535 / 1400, 835 / 1400, 1135 / 1400];
    const PHASE_HOLD_MS = 200;
    const BAND_WIDTHS_PER_SECOND = 0.5;
    const phasePosition = (phase) => `${((phase / (PHASE_COUNT - 1)) * 100).toFixed(4)}% 50%`;
    let bandWidth = 0;
    let elapsed = 0;
    let lastTick = 0;
    let rafId = 0;
    let inView = false;

    const measureBand = () => { bandWidth = lemonBand.clientWidth; };
    measureBand();
    addEventListener('resize', measureBand);

    new Promise((resolve, reject) => {
      const probe = new Image();
      probe.onload = () => (probe.naturalWidth === 3600 ? resolve() : reject());
      probe.onerror = reject;
      probe.src = SPRITE_SRC;
    }).then(() => {
      const step = () => {
        const now = performance.now();
        elapsed += now - lastTick;
        lastTick = now;
        const rotationStep = Math.floor(elapsed / PHASE_HOLD_MS);
        const march = (elapsed / 1000) * BAND_WIDTHS_PER_SECOND;
        lemons.forEach((lemon, i) => {
          const position = phasePosition((rotationStep + PHASE_OFFSETS[i]) % PHASE_COUNT);
          if (imgs[i].style.objectPosition !== position) imgs[i].style.objectPosition = position;
          const u = (START_FRACTIONS[i] + march) % 1;
          lemon.style.transform = `translateX(calc(-50% + ${((u - START_FRACTIONS[i]) * bandWidth).toFixed(2)}px))`;
        });
        rafId = requestAnimationFrame(step);
      };
      const start = () => {
        if (rafId || !inView || document.hidden) return;
        lemonBand.classList.add('is-running');
        lastTick = performance.now();
        rafId = requestAnimationFrame(step);
      };
      const stop = () => {
        if (!rafId) return;
        cancelAnimationFrame(rafId);
        rafId = 0;
        lemonBand.classList.remove('is-running');
      };
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          inView = entry.isIntersecting;
          if (inView) start(); else stop();
        });
      }, { threshold: 0 }).observe(lemonBand);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
      });
    }).catch(() => {
      /* the sprite failed to load: keep the static five-phase composition from the markup */
    });
  }

  // Reversible heading reveal (reference: play none none reverse)
  const reveals = document.querySelectorAll('.reveal');
  if (reduced) {
    reveals.forEach(r => r.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle('in', e.isIntersecting));
    }, { threshold: 0.3 });
    reveals.forEach(r => io.observe(r));
  }
})();

/* Mother Fable carousel law: one image at a time, a 4.5-second dwell and a
   deterministically restarted progress fill. */
(function () {
  const carousels = Array.from(document.querySelectorAll('[data-brand-carousel]'));
  if (!carousels.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll('.brand-slide'));
    const progress = carousel.querySelector('.progress');
    if (progress.children.length !== slides.length) {
      progress.replaceChildren(...slides.map(() => {
        const bar = document.createElement('span');
        bar.append(document.createElement('i'));
        return bar;
      }));
    }
    const bars = Array.from(progress.querySelectorAll('span'));
    let active = 0;
    let timer = 0;
    let paused = false;

    function show(next) {
      active = (next + slides.length) % slides.length;
      carousel.dataset.activeSlide = String(active);
      slides.forEach((slide, index) => {
        const isActive = index === active;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });
      bars.forEach((bar, index) => {
        bar.classList.remove('running');
        const fill = bar.querySelector('i');
        fill.style.animation = 'none';
        void fill.offsetWidth;
        fill.style.animation = '';
        bar.classList.toggle('running', index === active && !reduced);
      });
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
      if (!reduced && !paused) {
        timer = setTimeout(() => show(active + 1), 4500);
      }
    }

    function pause() {
      paused = true;
      carousel.classList.add('paused');
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    }
    function resume() {
      paused = false;
      carousel.classList.remove('paused');
      if (!reduced && !timer) timer = setTimeout(() => show(active + 1), 4500);
    }

    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);

    show(0);
  });
})();
/* ---------- (05) the scroll-stepped deck: seven values as a physical stack (k3-v2, stage 2) ----------
   Measured law (carenbloom-pb-reveal-observe-sol-o1): the reference reads flowy because tweens are
   time-based and complete once started — a value computed directly from scroll position freezes with
   the reader's hand. Also measured on the live site (this task, work/study/carousel-mechanics.mjs):
   the reference's own carousel is BUTTON-driven (stack-prev-btn/stack-next-btn, no ScrollTrigger on
   the stack, no pin) — so scroll-driving here is the captain's deliberate departure, implemented to
   the measured law: scroll CROSSES a threshold, the crossing sets --i once, and the CSS transition
   runs to completion whether or not the hand keeps moving. Buttons, keyboard, and the ledger remain
   as accessible fallbacks; taking manual control disarms scroll-driving until the section is re-entered. */
(function () {
  const deck = document.getElementById('valueDeck');
  if (!deck) return;
  const section = document.getElementById('values');
  const stage = document.getElementById('valuesStage');
  const frame = document.getElementById('deckFrame');
  const cards = Array.from(deck.querySelectorAll('.value-card'));
  const prevBtn = document.getElementById('deckPrev');
  const nextBtn = document.getElementById('deckNext');
  const counter = document.getElementById('deckCounter');
  const jumps = Array.from(document.querySelectorAll('.value-index a[data-jump]'));
  const N = cards.length;
  const PEEK_X = 12, PEEK_Y = 16; // px per buried card — mirrored in style.css, keep in sync
  /* round 4 held stage: the whole composition pins in one viewport (width ≥ 992 and a measured
     card height ≥ MIN_CARD_H — shorter viewports fall back to the v3 free-stepped deck below).
     The runway is explicit normal-flow section height, attributable only to the seven cards:
     OPEN_VH of opening breath on card 01, seven equal SHARE_VH shares, then DWELL_VH on card 07
     before release into Teams. Spacing constants mirror the .is-held CSS block — keep in sync. */
  const HELD_MIN_W = 992, MIN_CARD_H = 350;
  const OPEN_VH = 0.35, SHARE_VH = 0.5, DWELL_VH = 0.4;
  const HELD_PAD_TOP = 48, HELD_PAD_BOTTOM = 24, HELD_LABEL_MB = 32, HELD_H2_MB = 32, HELD_CONTROLS_H = 44 + 12;
  let order = cards.map((_, i) => i); // order[0] is the front card
  let live = false;
  let held = false;
  let inView = false;
  let manualOverride = false;

  const pad = (n) => String(n).padStart(2, '0');

  function render() {
    order.forEach((cardIdx, pos) => cards[cardIdx].style.setProperty('--i', pos));
    const front = order[0];
    if (counter) counter.textContent = pad(front + 1) + ' / ' + pad(N);
    jumps.forEach(a => a.classList.toggle('is-current', Number(a.dataset.jump) === front));
  }

  function setFront(idx) {
    const front = order[0];
    if (idx === front) return;
    order = cards.map((_, k) => (idx + k) % N);
    render();
  }

  /* scroll -> threshold -> one state change -> time-based transition completes (never a scrub).
     Entry-zone law (k3-v3): progress is measured over the deck frame's own usable viewport
     interval, NOT the whole oversized section from its document top. p = 0 while the deck's
     top is still below 60% of the viewport height — the heading, ledger, and deck establish
     themselves with card 01 active; an additional 0.2vh hold keeps 01 front while the visitor
     settles. Stepping begins only once the deck itself is meaningfully visible and the visitor
     keeps scrolling. p = 1 when the section's bottom reaches 45% of the viewport height (the
     deck's tail and controls still on screen). floor(p * N) gives every card an equal
     share of the real traversal, so card 01 holds for the hold plus the first seventh of it. */
  function scrollIndex() {
    const vh = innerHeight;
    if (held) {
      /* the sticky interval: y is px scrolled into the runway. y <= 0 while the stage is still
         below the usable viewport — no progress accumulates on approach (v3 entry law stands). */
      const y = -section.getBoundingClientRect().top;
      if (y <= 0) return 0;
      const open = vh * OPEN_VH, share = vh * SHARE_VH;
      if (y < open) return 0;
      return Math.min(N - 1, Math.floor((y - open) / share));
    }
    const fr = frame.getBoundingClientRect();
    const sr = section.getBoundingClientRect();
    const start = vh * 0.6;   // deck top must be meaningfully up the viewport before counting
    const hold = vh * 0.2;    // card 01's opening zone: the deck establishes itself first
    const end = vh * 0.45;    // p = 1 when the section bottom reaches 45% vh (deck tail on screen)
    const frameOffset = fr.top - sr.top;
    const range = Math.max(1, (start - end) + sr.height - frameOffset - hold);
    const p = Math.min(1, Math.max(0, (start - fr.top - hold) / range));
    return Math.min(N - 1, Math.floor(p * N));
  }

  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      if (!live || !inView || manualOverride) return;
      setFront(scrollIndex());
    });
  }

  function tallestCard() {
    let max = 0;
    cards.forEach(c => { max = Math.max(max, c.offsetHeight); });
    return max;
  }

  function sizeDeck() {
    if (held) {
      /* fit the card to the one-viewport budget: everything fixed (pads, label, heading, controls,
         peeks) is measured or mirrored from the .is-held CSS; the card takes what remains, 4/5 kept. */
      const vh = innerHeight;
      const label = section.querySelector('.section-label');
      const h2 = section.querySelector('.vt-display');
      const fixed = HELD_PAD_TOP + HELD_PAD_BOTTOM + label.offsetHeight + HELD_LABEL_MB + h2.offsetHeight + HELD_H2_MB;
      const boardH = vh - fixed;
      let cardH = Math.floor(boardH - HELD_CONTROLS_H - PEEK_Y * (N - 1));
      let cardW = Math.floor(cardH / 1.25);
      const maxW = frame.clientWidth - PEEK_X * (N - 1);
      if (cardW > maxW) { cardW = maxW; cardH = Math.floor(cardW * 1.25); }
      deck.style.width = cardW + 'px';
      deck.classList.add('is-live');
      deck.style.height = (cardH + PEEK_Y * (N - 1)) + 'px';
      return cardH;
    }
    // measure in list mode at the live width, then fix the frame for the stack
    deck.style.width = 'calc(100% - ' + (PEEK_X * (N - 1)) + 'px)';
    const h = tallestCard();
    deck.classList.add('is-live');
    deck.style.height = (h + PEEK_Y * (N - 1)) + 'px';
    return h;
  }

  function enable() {
    held = innerWidth >= HELD_MIN_W;
    let cardH = 0;
    if (held) {
      section.classList.add('is-held');
      cardH = sizeDeck();
      if (cardH < MIN_CARD_H) {
        /* intermediate heights where the full held composition cannot fit safely:
           fall back to the v3 free-stepped deck (still threshold-stepped, never scrubbed) */
        held = false;
        section.classList.remove('is-held');
        deck.classList.remove('is-live');
        deck.style.width = '';
        sizeDeck();
      } else {
        const vh = innerHeight;
        const runway = Math.round(vh * OPEN_VH + N * vh * SHARE_VH + vh * DWELL_VH);
        section.style.height = (Math.max(vh, stage.offsetHeight) + runway) + 'px';
      }
    } else {
      sizeDeck();
    }
    frame.classList.add('is-live');
    live = true;
    prevBtn.hidden = false;
    nextBtn.hidden = false;
    deck.tabIndex = 0;
    deck.setAttribute('aria-label', 'Operating values deck — left and right arrow keys step through the cards');
    setFront(Math.min(scrollIndex(), N - 1));
    render();
  }

  function disable() {
    if (!live) return;
    deck.classList.remove('is-live');
    deck.style.height = '';
    deck.style.width = '';
    frame.classList.remove('is-live');
    section.classList.remove('is-held');
    section.style.height = '';
    held = false;
    live = false;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    deck.removeAttribute('tabindex');
    deck.removeAttribute('aria-label');
    jumps.forEach(a => a.classList.remove('is-current'));
  }

  function syncMode() {
    if (innerWidth >= 768) {
      disable(); // full teardown: held/free decision, sizing, and runway are all re-derived
      enable();
    } else {
      disable();
    }
  }

  /* manual control wins; scroll-drive re-arms when the section has fully left the viewport */
  function manual(fn) {
    return (e) => {
      if (!live) return;
      if (e && e.preventDefault && e.currentTarget.tagName === 'A') e.preventDefault();
      manualOverride = true;
      fn(e);
    };
  }
  nextBtn.addEventListener('click', manual(() => setFront((order[0] + 1) % N)));
  prevBtn.addEventListener('click', manual(() => setFront((order[0] + N - 1) % N)));
  jumps.forEach(a => a.addEventListener('click', manual(() => setFront(Number(a.dataset.jump)))));
  deck.addEventListener('keydown', (e) => {
    if (!live) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); manualOverride = true; setFront((order[0] + 1) % N); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); manualOverride = true; setFront((order[0] + N - 1) % N); }
  });

  new IntersectionObserver((entries) => {
    entries.forEach(en => {
      inView = en.isIntersecting;
      if (!en.isIntersecting) { manualOverride = false; }
      else if (live && !manualOverride) setFront(scrollIndex()); // re-entry sync: IO can land after the scroll rAF
    });
    /* threshold 0, not a fraction: the held section is ~5x the viewport, so a fractional
       threshold would miss direct jumps into the runway (a deep-anchored or restored scroll
       can land inside the section without ever crossing 5% visibility) */
  }, { threshold: 0 }).observe(section);

  addEventListener('scroll', onScroll, { passive: true });
  let dT;
  addEventListener('resize', () => { clearTimeout(dT); dT = setTimeout(syncMode, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncMode);
  syncMode();
})();
