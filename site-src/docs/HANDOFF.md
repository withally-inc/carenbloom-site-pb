# Handoff

> **Integration pass, 2026-10-21:** historical resolutions and wording questions are recorded below.
> Current API behavior is owned by the [README](../../README.md#canonical-role-data-and-lifecycle).
> Results and Lighthouse are in `docs/QA.md`.


## Foundation v2 (2026-10-21): notes for section agents
- Hero: `div.hero__media` overflows the page by 2px at 1440px (smoke on 4185: `scrollWidth 1442`). Use `lines:landed` on the h1 (or its `.landed` class) to start the breathing ampersand.
  - **Resolved (integration):** no overflow at 1440; the only overflow left was 1px at 390 from the hero line masks, fixed with `overflow-x: clip` on `.hero`. Smoke now checks strictly.
- Brands: `src/data/brands.ts(232)` passes `string | null` to a `string` parameter; `src/sections/brands.ts(134)` adds `visibilitychange` on an element (use `document`, or `whileVisible()` from `lib/live.ts`). `pnpm build` fails on tsc until these are fixed. `.dotlink--stretch` is ready for the whole-card link.
  - **Resolved:** `pnpm build` is clean.
- Everyone: cards, panels and rows take `data-reveal="rise"` (plain `data-reveal` now blurs only text-sized elements on desktop). `.live-dot` no longer loops: call `pulse(dot)`. Stagger groups cap at 6.
  - Informational, applied by the sections.
- Careers agent: `/404.html` exists (`src/sections/notfound.*` placeholders are yours). Listen for `egg:bloom` to bloom the bud. Use `budPetals()` from `lib/bloom.ts`.
  - **Resolved:** the careers agent built the 404 bud; it now uses petal states (see the brands item on `budPetals()`).
- Collection consumers: see [FOUNDATION's helper reference](FOUNDATION.md#lib) and the [README lifecycle contract](../../README.md#canonical-role-data-and-lifecycle).

## People + How we work (people agent, 2026-10-21)
- Copydeck: the portrait alt reads "Portrait of {name}, printed in cobalt duotone", but at rest the People section shows the ink print (cobalt only develops on hover/focus). Proposed: "Portrait of Rahul Ramchand" / "Portrait of Momoko Kashiwabara". Shipped verbatim until cleared.
  - **Resolved:** COPY-DECISIONS 7 applied in `people.html`, COPY.md and the image manifest.
- Foundation (optional): `.dotlink--stretch` gives no hover gesture when the pointer is on the block but off the label. `people.css` replicates the dot/push/underline under `.person:hover`; brands may want a shared `:has()` rule like `:where(*):has(> * > .dotlink--stretch):hover .dotlink--stretch …`.
  - **Resolved:** `.link-block` on the block (components.css) gives its stretched link the gesture anywhere on the block except over its buttons, `:active` on touch; people and brand cards use it, the people-only copy is deleted. Careers rows are the `<a>` itself and keep their row-scale gesture.
- E2 stores the visitor's best turn in `localStorage['cb-cycle-best']` (seconds, 3 decimals); `cb-eggs` gets `cycle` / `reorg` through `playEgg`.
  - Informational.
- `.work` and `.people` use `overflow: clip` (lemon and develop never cause horizontal scroll). The 1px `scrollWidth 391` at 390px comes from outside these two sections.
  - **Resolved:** the 1px came from the hero masks (see the first item).

## Careers + Apply + 404 (careers agent, 2026-10-21)
- Foundation, `lib/odometer.ts`: `<span data-odo>9</span>` renders empty. `initial ?? el.dataset.odo ?? el.textContent` picks `""` (an empty attribute is not nullish). Fix: `initial ?? (el.dataset.odo || el.textContent || '0')`. Careers sets `data-odo="15"` explicitly meanwhile.
  - **Resolved:** `initial ?? (el.dataset.odo || el.textContent?.trim() || '0')`; record and careers no longer write the value twice.
- Footer: on `/careers` the footer repeats "Join the *spaceship*." right under the page's own h1 of the same words. Proposed: hide statement 1 on `body[data-page="careers"]` and `body[data-page="apply"]`, keep "Start a conversation.".
  - **Resolved:** COPY-DECISIONS 8, `.statement--careers` hidden on both pages, the remaining statement takes the full width.
- Deployed role routes and canonical URLs: see the [README](../../README.md#routes).
- Shared helpers live in `src/sections/careers.ts` and are imported by `apply.ts`: `cleanDashes()` (the one dash helper of COPY-DECISIONS 2), `petalLoader()` (BRAND 9 loader, CSS in `careers.css`), `revealLater()`. Candidates for `src/lib/` if another section needs them.
  - **Resolved:** `cleanDashes()` in `lib/text.ts`, `petalLoader()` in `lib/bloom.ts` (CSS in components.css), `revealLater()` in `lib/reveal.ts`. Apply no longer loads careers.css.
- Unknown-role behavior: see the [README lifecycle contract](../../README.md#canonical-role-data-and-lifecycle).
- Decision: the brief's design intent says the row arrow "advances on hover"; MOTION-CHALLENGE 1.28 says it does not move (one gesture per link). Followed the challenge: dot + 14px push + cobalt hairline, the arrow only turns cobalt.
  - Kept as decided (MOTION-CHALLENGE 1.28).

## Brands agent (2026-10-21)
- **Work agent, `src/sections/work.css`:** the bare `.petal` rule (rotate 45deg, width, margin) also matches every `g.petal` that `lib/bloom.ts buildPetals()` creates (spaces indicator, footer bloom, 404 bud) and rotates them. Please scope it (`.pc__item .petal`) or rename the bullet class (`.petal-bullet`). Spaces and the brand buds set inline transforms meanwhile, so they are safe either way.
  - **Resolved:** the rule is `.pc__petal` (bullet class), verified. Petal transforms are now inline styles written by `buildPetals()` states, so no stylesheet can turn a mark; checked at rest on the nav, spaces, footer and 404 marks.
- **Foundation, `lib/bloom.ts budPetals()`:** GSAP `svgOrigin` measures the petals; called during init (under the preloader) it caches a wrong origin and the petals end up offset (seen as `matrix(1,0,0,1,-8.7,21)` at scale 1). Suggest writing the transform explicitly about the centre: `translate(21px,21px) scale(s) translate(-21px,-21px)` with `transform-box: view-box; transform-origin: 0 0`. Spaces does exactly this locally.
  - **Resolved:** `buildPetals()` returns `states`, one per petal, writing `translate(21 + x, 21 + y) rotate(r) scale(s) translate(-21, -21)` with `transform-box: view-box; transform-origin: 0 0`. Every caller (preloader, nav, menu, footer, spaces, brands, 404, apply success) tweens states; no `svgOrigin` remains. Spaces and the brand buds dropped their local workarounds for `budPetals()`.
- **Main, `package.json`:** please add `"brands": "node -e \"import('./src/data/brands.ts').then((m) => m.syncSections(require('node:fs')))\""`. It regenerates the brand cards and spaces rows from the registry (dev also warns in the console when the HTML is stale).
  - **Resolved:** the script is in `package.json` (`pnpm brands`).
- **Assets, `scripts/images.mjs`:** please add `ground` (hex of sharp `stats().dominant`) to each manifest image. The registry already prefers `manifest.images[key].ground` over its hand-sampled value, so new brands need no hex typed.
  - **Resolved:** every manifest image has `ground`; the six brand grounds equal the registry values, so the generated markup did not change. Rerun diffed: image files byte-identical.
- **Copydeck:** E5 (wave at the Hello Nancy card) ships the fruit rolling in and rocking once, with no text. The reply "Hello yourself." (fallback "Hello.") from MOTION-CHALLENGE E5 needs approval in COPY.md before it can be added.
  - **Resolved:** COPY-DECISIONS 6, "Hello yourself." rises beside the name (above it when the card is narrow), Newsreader italic at the name's x-height, rise 1.1 s, hold 1.6 s, fade 300 ms, `aria-hidden`.

## Hero agent (2026-10-21)
- Foundation, `src/lib/odometer.ts` line ~25: `initial ?? el.dataset.odo ?? el.textContent` keeps `""` when the markup is a bare `data-odo` (the FOUNDATION example), so the number renders empty (`aria-label=""`, no digits). Fix: `initial ?? (el.dataset.odo || el.textContent || '0')`. Workaround in `record.html`: explicit values (`data-odo="1,000,000+"`). Other sections using a bare `data-odo` are affected today.
  - **Resolved:** see the careers item; `record.html` uses bare `data-odo` again.
- Copy check for Rahul (E1): the absence tick shows "≈ +N" (the main session's spec), not the bare "+N" written in MOTION-CHALLENGE E1. The "≈" mirrors the caption "+1 ≈ every 23 s".
  - **Open, for Rahul at preview:** shipped as "≈ +N".
- The hero h1 does not use `data-lines` (three words in hand-made masks, MOTION-CHALLENGE 1.11), but it follows the same contract: `.landed` on the h1 and `lines:landed` fired on it.
  - Informational.

## Nav (nav agent, 2026-10-21)
- Copydeck: the nav now has four destinations, adding "How we work" (`/#work`, the section's own label) between People and Careers, desktop and mobile menu. COPY.md "Navigation" and "Mobile sheet" tables list three; please add the row (verbatim section label). The mobile toggle shows no visible word: aria-labels "Open menu" / "Close menu" as listed.
  - **Resolved:** COPY-DECISIONS 11; COPY.md lists the four links, the compass behaviour, the quartered mobile menu and `aria-current`. The footer nav lists the same four.
- People agent (work.html): `data-spy="people"` on `#work` can become `data-spy="work"`; the nav already maps `#work` to "work" by id, so nothing breaks either way.
  - **Resolved:** `data-spy="work"`.
- Foundation (components.css line ~596): the comment "lib/glass.ts adds refraction + specular" is stale, glass.ts is deleted (nothing else imported it). `.glass` itself stays (brand-card pause buttons).
  - **Resolved:** comment rewritten, the refraction rule and pointer specular removed; `.glass` stays for the pause buttons.
- Foundation (base.css ~176): the route-fade comment mentions "the glass header"; the header is no longer glass, the `.nav` exclusion is still right.
  - **Resolved:** comment rewritten; the dead `.sheet` exclusion removed.

## Record (record agent, 2026-10-21)
- Foundation / copydeck: the sun highlighter now sits on the wink *profitably* (owner's direction for the record redesign), against the FOUNDATION rule "never on a wink word". It is record's own `.record__sun` (not `.hl`), drawn when the 36th month cell lands; it is the section's only sun.
  - **Open, for the foundation agent:** add the exception to FOUNDATION or say which word should carry it.
- Live tip: `record.ts` binds `bindLiveTip(lastDot, { selfTick: false })` to the cobalt last dot of the 1,000-dot field and calls `tip.tick()` on its own 23 s pulse. It loads `lib/livetip.ts` through `import.meta.glob`, so the build passes with or without the file; at the time of writing `src/lib/livetip.ts` exists in the tree but is not committed.
  - **Open, for the hero agent:** commit `lib/livetip.ts` + `livetip.css`; nothing else to change for record.
- New copy in record (no new figures): "Each dot is 1,000 customers." (dot legend), "Revenue, nine figures" (label), "Year 1 / 2 / 3" (aria-hidden strip labels), and the proof as a sentence "Operators who previously scaled IM8, Peak21 and CASETiFY." (logo alts). COPY.md section 2 needs these rows.

## Build with us (build agent, 2026-10-21)
- Spaces agent: the category tiles in `src/sections/build.html` use petals from `lib/bloom.ts` (`buildPetals`, one svg per tile, `data-petal="0..3|all"`, N/E/S/W in the spaces order) because the four spaces icons were not committed yet. Once they land, swap each tile's `svg.bw-tile__icon` for the matching icon and keep the state hook: `build.ts drawPetals()` runs on every category `change`; the checked tile is `.bw-tile__input:checked + .bw-tile__face`.
- Owner: the form has no backend. A valid submit opens a `mailto:` draft to hello@carenbloom.com (subject "Build with us: {brand}"). A real inbox or endpoint (for example a Vercel function with Resend) is a later upgrade; the form markup and validation can stay as they are.
- Copy for the section is in `docs/COPY.md` 6b, marked "new copy, Rahul to validate".

## Companions (companions agent, 2026-10-21)
- Work agent (later, optional): `src/lib/companion.ts` is the lemon's behaviour as an engine (FOUNDATION "Companions"). The lemon in `work.ts` can migrate to `createCompanion(root, { sprite: '/img/lemon-sprite', frames: 10, frameSize: 180, size: (w) => …, rest, reading: '.values__slot, .values__list, .pc', offset: 18, onEgg: (e) => e.type === 'turn' && … })`: the E2 loop detector stays in `work.ts` (it reads the pointer's heading, not the frames), `hop()` covers the values hop. Two things to align first: the lemon files are named `lemon-sprite-180/-360` (frameSize 180 works as is) and only `lemon-sprite-violet-360` exists (add `-violet-180`). Until then the lemon does not take part in the one-visible-companion rule; its zone never overlaps a brand card, so two never show at once under a pointer.
- Foundation: `companion.ts` repeats the violet naming rule and the `theme:change` event name locally instead of importing `lib/theme.ts`, which was not committed when this landed. Swap to `themedSrc()` / `THEME_EVENT` once it is.

## Spaces + work agent (2026-10-21, owner feedback round)
- **Brands registry owner, `src/data/brands.ts renderSpacesList()`:** optional. The space icons (`src/sections/spaces.icons.ts`) are injected by `spaces.ts` in front of `.space__title` because the rows are a generated region. If you want them in the static HTML, render `<span class="space__icon" aria-hidden="true"></span>` before the title and I will fill it instead of creating it (spaces.ts already skips a row that has one).
- **Brand (BRAND.md section 9) for the brandbook:** the owner asked for one icon per vertical. They are the one exception to "no pictogram set on the website": built from the mark's petal (90 degree tip, round base, the counter's swirl as a vein), stroke 2 in the 42 box (the mark's weight), ink at rest, cobalt when open. Sheet: `qa/spaces-pc/icon-sheet.png`.
- **Lemon (work.ts), for whoever migrates it to a shared engine:** its rest spot now reads `card.dataset.lemonRest` (`'top'` = above the card's top right, or top middle on a narrow card), set by the values art (`work.art.ts`) so the lemon never rests on a hand. Keep that hook. The violet sprite is `/img/lemon-sprite-violet-{180,360}.webp`, swapped in by `themeLemon()` once the file loads.

## Violet agent (2026-10-21)
- **Assets pipeline, resolved:** see [the asset guide](ASSETS.md) for current rebuild order and cleanup ownership.
- **Every section owner:** `docs/VIOLET-SWEEP.md` lists the exact lines to change per file (shadows to `--shadow-rgb`, sun type to `--on-sun`, photo overlays to `--fixed-*`, People night to `--night`, `-violet` images). Do not hardcode new hex values; new tokens are in `tokens.css` (`--night --on-sun --on-cobalt --ink-hover --cobalt-hover --cobalt-on-ink-hover --fixed-ink --fixed-paper --fixed-ink-rgb --fixed-paper-rgb --shadow-rgb --hl-y --hl-h --hl-fg`).
- **Hero:** after the hero markup moves to two lazy pictures, the `index.html` theme script needs the active-theme preload (snippet in VIOLET-SWEEP, hero). Until then violet mode downloads the light rose and shows it.
- **Nav (changed):** the mark is now `button.nav__theme` (the violet-mode switch, desktop) and the wordmark alone is `a.nav__home` (home, scroll to top on home). Below 960px the mark stays covered by the menu button; the switch is `.panel__theme` in the menu. The preloader still lands on `.nav__icon`.
