# Violet sweep: what each section must change

Violet mode (docs/BRAND.md, "Violet mode") works by giving the existing tokens new values under `html[data-theme="violet"]`. Most section CSS therefore switches by itself: `color: var(--ink)` becomes lavender type, `background: var(--paper)` the violet ground, `var(--cobalt)` the violet-blue, `rgba(var(--ink-rgb), .06)` a lavender tint. **A line that uses a token for its role needs nothing.** This list covers only what breaks:

1. **Shadows** written with `--ink-rgb` turn into glows: use `--shadow-rgb`.
2. **Sun with type on it**: type must be `--on-sun` (dark) in both themes. Sun underlines get the violet highlighter geometry (`--hl-y`, `--hl-h`, `--hl-fg`, see components.css `.hl`).
3. **Over photography**: `var(--paper)` / `var(--ink)` / `--ink-rgb` / `--paper-rgb` flip with the theme. Use `--fixed-paper`, `--fixed-ink`, `--fixed-ink-rgb`, `--fixed-paper-rgb`.
4. **Dark grounds written as ink** (the People night) must use `--night`.
5. **Images**: `-violet` siblings (naming in docs/ASSETS.md; `themedSrc()` in `src/lib/theme.ts`). Only the active theme's file may load.

Helpers: `getTheme()`, `onTheme(fn)` (window event `theme:change`, detail `{ theme }`), `themedSrc(url)`, `themedSrcset(srcset)` from `src/lib/theme.ts`; CSS classes `.theme-only-light` / `.theme-only-violet` (the inactive one is `display:none`; with `loading="lazy"` it is never fetched until its theme is on).

**Status, 21 Oct 2026 (phase 2): applied** by the violet agent in hero, record, people, places, work, work.pc, build, apply and lib/livetip; spaces, careers and notfound needed nothing. Left to the companions agent: brands.* and src/data/brands.ts (their lines below). Also fixed on the way: record.ts, places.ts and work.art.ts listened to `themechange`; the event is `theme:change` (`THEME_EVENT`). Verified in `qa/violet/` (every page, both themes, 1440 and 390; `sun-*.png` for the highlighters): each theme loads only its own hero still and frames, LCP is the active theme's still.

Line numbers are from the files as of this writing; search the quoted text if they moved.

## hero (`hero.html`, `hero.css`, `hero.ts`): owner hero

| Where | Now | Change to |
|---|---|---|
| `hero.ts` `frameSrc` (line ~25) | `/img/bloom-seq/bloom-${nn}.webp` | `themedSrc(\`/img/bloom-seq/bloom-${nn}.webp\`)` (→ `bloom-violet-NN.webp`, 49 files exist). On `onTheme()`, drop the decoded frames and reload with the new theme (the browser cache makes a switch back free); redraw the current frame once loaded. |
| `hero.ts` ~458 (open still) | `end.srcset = '/img/hero-end-480.webp 480w, /img/hero-end-896.webp 896w'`, `end.src = '/img/hero-end-896.webp'` | `themedSrcset(...)`, `themedSrc(...)`; swap again on `onTheme()` |
| `hero.html` 55 to 56 `<picture>` | one `<picture>` with light `hero-start` (eager, `fetchpriority="high"`) and the reduced-motion `hero-end` source | Two pictures, same markup, classes `theme-only-light` and `theme-only-violet`, the second with `-violet-` URLs (`/img/hero-start-violet-480.webp 480w, /img/hero-start-violet-896.webp 896w`, reduced motion `/img/hero-end-violet-…`). Both `loading="lazy"` and no `fetchpriority` (the hidden one must not load). Then add the preload below to the theme script in `index.html` (theme-script owner: violet agent, or main). |
| `index.html` theme script (after the sweep only) | sets `data-theme` | append: `var s = t === 'violet' ? '-violet' : ''; var rm = matchMedia('(prefers-reduced-motion: reduce)').matches; var k = rm ? 'hero-end' : 'hero-start'; var l = document.createElement('link'); l.rel = 'preload'; l.as = 'image'; l.fetchPriority = 'high'; l.setAttribute('imagesrcset', '/img/' + k + s + '-480.webp 480w, /img/' + k + s + '-896.webp 896w'); l.setAttribute('imagesizes', '(min-width: 768px) 40vw, 64vw'); document.head.appendChild(l)` (restores the LCP discovery the lazy images lose; srcset and sizes must match the `<img>` exactly) |
| `hero.css` 353 `.hero__veil { background: var(--paper) }` | | nothing (the veil follows the ground) |
| Video files `hero-bloom-*.mp4/webm` | light only | in violet mode never use the video path; scrub the sequence (it is the default already) |

## record (`record.html`, `record.css`, `record.ts`): owner record-v2

| Where | Now | Change to |
|---|---|---|
| `record.html` 41, three logos | `<img src="/img/logos/im8.svg" …>` (same for `peak21`, `casetify`) | each logo twice: `<img class="theme-only-light" src="/img/logos/im8.svg" … loading="lazy">` + `<img class="theme-only-violet" src="/img/logos/im8-violet.svg" … loading="lazy">` (`peak21-violet.svg`, `casetify-violet.svg` exist). Keep `alt` on both (only one is ever rendered). Keep `.record__casetify` on both Casetify images. |
| `record.css` 33 `.record__sun` | `linear-gradient(var(--sun), var(--sun)) no-repeat 0 86% / 100% 0.4em` | add `[data-theme="violet"] .record__sun { background-position: 0 var(--hl-y); background-size: 100% var(--hl-h); color: var(--hl-fg); }` (and the 0%-size start state, if record.ts draws it, at `0% var(--hl-h)`) |
| `record.css` 62, 69, 190, 238, 243 (`var(--ink)` cells, key dot, slot ring, slot fill) | | nothing (they are marks, lavender on violet reads) |

## brands (`brands.css`, `brands.html`, `brands.ts`): owner sec-brands

| Where | Now | Change to |
|---|---|---|
| `brands.css` 161, 162 photo scrim | `rgba(var(--ink-rgb), 0.46 / 0.2 / 0 / 0.16 / 0)` | `rgba(var(--fixed-ink-rgb), …)` same alphas |
| 179, 197 name and meta over photo | `color: var(--paper)` | `color: var(--fixed-paper)` |
| 180, 198 text-shadow | `rgba(var(--ink-rgb), 0.22)` | `rgba(var(--fixed-ink-rgb), 0.22)` |
| 222 Biird tittles on the photo | `color: var(--paper)` | `color: var(--fixed-paper)` |
| 228 tittles perched off the photo | `color: var(--ink)` | nothing (on the page ground: lavender in violet) |
| 248, 253 story segments over photo | `rgba(var(--paper-rgb), 0.4)` / `0.95` | `rgba(var(--fixed-paper-rgb), 0.4)` / `0.95` |
| 284 pause button icon (on white `.glass`) | `color: var(--ink)` | `color: var(--fixed-ink)` (the glass stays white over photos) |
| 296 pause focus ring over photo | `outline: 2px solid var(--paper)` | `outline: 2px solid var(--fixed-paper)` |
| 69, 399 `var(--ground, var(--mist))` | | nothing (brand grounds are product colours; the mist fallback switches) |
| `src/data/brands.ts` 134, 208 | `MIST = '#DCEDF5'` as the ground fallback written inline | write `var(--mist)` as the fallback instead of the hex, so a card without a photo ground follows the theme (regenerate with `pnpm brands`) |

## spaces (`spaces.css`): owner spaces-work-v2

Nothing. `var(--ink)` and `var(--cobalt)` switch; the "In market" chip takes `--on-sun` from components.css.

## people (`people.html`, `people.css`): owner sec-people

| Where | Now | Change to |
|---|---|---|
| `people.html` 13 to 22 (Rahul) and 32 to 41 (Momoko) | `.person__print` picture with `portrait-*-ink-{480,640}.{avif,webp}`; `.person__dev` picture with `portrait-*-cobalt-…` | add a second `.person__print` picture and a second `.person__dev` picture with the `-violet-` files (`portrait-rahul-ink-violet-480.avif`, `…-640.webp`, `portrait-rahul-cobalt-violet-…`, same for momoko; all 16 exist). Light pictures get `theme-only-light`, violet ones `theme-only-violet`; all `loading="lazy"` (they are). The `<img data-decode>` and `alt` go on both prints. If the crossfade CSS targets `.person__print img` by position, it keeps working since only one of each pair renders. |
| `people.css` 51 print placeholder | `color-mix(in srgb, var(--ink) 90%, var(--on-ink))` | `color-mix(in srgb, var(--night) 90%, var(--on-ink))` (in violet `--ink` is lavender, this would flash light) |
| `people.css` 16, 22, 72, 88, 93 (`--on-ink`, `--on-ink-2`) | | nothing (they switch to the night values) |

## places (`places.css`): owner places-map

| Where | Now | Change to |
|---|---|---|
| `places.css` 54, 55 label halo | `text-shadow: 0 0 6px var(--ink), 0 0 2px var(--ink)` | `var(--night)` (the halo is the section ground: in violet `--ink` is lavender and would glow) |
| 102 `fill: var(--sun)` | | nothing |

## work (`work.css`, `work.pc.css`, `work.art.ts`): owner spaces-work-v2

| Where | Now | Change to |
|---|---|---|
| `work.css` 131, 132 values card shadow | `rgba(var(--ink-rgb), 0.04)`, `rgba(var(--ink-rgb), 0.2)` | `rgba(var(--shadow-rgb), …)`; in violet raise the alphas (`[data-theme="violet"] .values__card { … 0.3 / 0.6 }`, as `.card` does) |
| `work.css` 217, 262 (`rgba(var(--ink-rgb), .05 / .16)` press tint, dots) | | nothing (tints) |
| `work.css` 297, 298 lemon sprite; 418 to 421 `.lemon--violet` | | done by the owner (commit cae1745: `lemon-sprite-violet-{180,360}.webp`) |
| `work.pc.css` 31, 32 card shadow | `rgba(var(--ink-rgb), 0.04 / 0.2)` | `rgba(var(--shadow-rgb), …)` |
| `work.pc.css` 110, 111 KPI chip | `background: var(--sun); color: var(--ink)` | `color: var(--on-sun)` |
| `work.pc.css` 238 | `0 2px 6px -2px rgba(var(--ink-rgb), 0.18)` | `rgba(var(--shadow-rgb), 0.18)` |
| `work.art.ts` values art | `srcViolet` / `srcsetViolet` per entry | done by the owner; files must follow the `-violet` rule and be produced with `node scripts/halftone-dark.mjs img/<file>` if they are ink + cobalt halftones |

## build (`build.css`): owner build-with-us

| Where | Now | Change to |
|---|---|---|
| `build.css` 43, 44 card shadow | `rgba(var(--ink-rgb), 0.04 / 0.18)` | `rgba(var(--shadow-rgb), …)` (violet alphas 0.3 / 0.6) |
| 99 `.bw-label__text` error highlighter | `0 88% / 0% 0.46em` (and its drawn state at `100% 0.46em`) | add `[data-theme="violet"] .bw-label__text { background-position: 0 var(--hl-y); background-size: 0% var(--hl-h); }` and in the invalid state `100% var(--hl-h)` with `color: var(--hl-fg)` |
| 284 `.bw-status__hl` | `0 88% / 100% 0.46em` | `[data-theme="violet"] .bw-status__hl { background-position: 0 var(--hl-y); background-size: 100% var(--hl-h); color: var(--on-sun); }` |
| 238 to 240 selected chip | `background: var(--ink); border-color: var(--ink); color: var(--paper)` | nothing (inverts to a lavender chip with dark type, 15.5:1) |
| 9, 10, 145, 253, 359 (`--ink-rgb` lines, `--cobalt-rgb` ring) | | nothing (tints and rings) |

## careers (`careers.css`): owner sec-careers

Nothing. Lines 117 and 316 are tints, 188 and 203 cobalt marks; all switch.

## apply (`apply.css`): owner sec-careers

| Where | Now | Change to |
|---|---|---|
| `apply.css` 92, 93 card shadow | `rgba(var(--ink-rgb), 0.04 / 0.18)` | `rgba(var(--shadow-rgb), …)` (violet 0.3 / 0.6) |
| 543, 544 dropdown shadow | `rgba(var(--ink-rgb), 0.05 / 0.24)` | `rgba(var(--shadow-rgb), …)` (violet 0.4 / 0.7) |
| 351, 357 `.f-label__text` error highlighter | `0 88% / 0% 0.46em` → `100% 0.46em` | `[data-theme="violet"] .f-label__text { background-position: 0 var(--hl-y); background-size: 0% var(--hl-h); }` and `[data-theme="violet"] .field[data-invalid] .f-label__text { background-size: 100% var(--hl-h); color: var(--hl-fg); }` |
| 842 `.f-summary__hl` | `0 88% / 100% 0.46em` | `[data-theme="violet"] .f-summary__hl { background-position: 0 var(--hl-y); background-size: 100% var(--hl-h); color: var(--on-sun); }` |
| 251 petal bullet, 634 to 636 selected chip, the `--ink-rgb` borders and tints | | nothing |

## notfound (`notfound.css`, `notfound.ts`): owner sec-careers or main

Nothing in CSS. The bud mark is `currentColor` and follows `--ink`.

## lib (not sections, listed for completeness)

| Where | Now | Change to |
|---|---|---|
| `src/lib/livetip.css` 63, 64 tooltip shadow | `rgba(var(--ink-rgb), 0.05 / 0.22)` | `rgba(var(--shadow-rgb), …)` |
| `src/lib/companion.ts` | `-violet` sprites | done (follows the rule) |
| `src/lib/eggs.ts` 205 console colours | `#2331E4`, `#2B3447` | nothing (the console is not themed) |

## Size of the sweep

About 45 line edits over 10 files, plus the hero and people markup (two pictures per image) and three logo pairs. Everything else switches through the tokens.
