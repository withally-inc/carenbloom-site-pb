# Foundation: what section agents use (v2)

Edit only your `src/sections/<name>.{html,ts,css}`. Need a foundation change? Write it in `docs/HANDOFF.md`.
Markup is static HTML (included at build by `<!-- @include sections/<name>.html -->`); JS only enhances.
Motion values come from `docs/MOTION-CHALLENGE.md` section 0; the constants below implement it.

## Section contract
- `<section id="…" class="section" data-section="<name>" data-spy="brands|people|work|careers">`. `data-spy` lights the nav destination and its petal on the nav mark (N Brands, E People, S How we work, W Careers). Spaces spies "brands"; `#work` counts as "work" whatever its data-spy says; the footer spies "careers".
- `<name>.ts` exports `init(root: HTMLElement): () => void` (return a cleanup). It runs under the preloader, before reveals start. Import `./<name>.css` there.
- DOM you add later (fetched lists): call `watch(container)` from `lib/reveal.ts` so its reveals register.
- People is the one dark section: `class="section surface-ink"`. `.on-ink` remaps text, dot links, focus ring and lines without the ground. The nav turns ink-toned (`nav[data-tone="ink"]`) while its line overlaps any `.surface-ink`, by itself.
- Pages: `/` home, `/careers`, `/careers/apply?role=<slug>` (no trailing slash; `/careers/apply/` 308s), `/404.html` (`sections/notfound`, `body[data-page="notfound"]`).

## Tokens (`tokens.css`; Tailwind: `bg-paper`, `text-ink-2`, `font-serif`, `text-h2`, `ease-house`, `ease-spring`…)
`--paper --paper-2 --mist --ink --ink-2 --muted(#5F6A78) --line --cobalt --sun`; on ink: `--on-ink --on-ink-2 --cobalt-on-ink --line-on-ink`.
Context (flip on ink, use in components): `--fg --fg-2 --fg-muted --accent --rule`.
Motion: `--ease` (expo.out, everything), `--spring` (CSS linear() from the 320/26 spring) with `--dur-spring` 430ms, `--dur-press` 100ms, `--dur-micro` 300ms, `--dur-ui` 500ms, `--dur-enter` 1.1s, `--ease-breath` (sine, the one ambient loop), `--ease-drawer` (folds). Exits take 40% of their entrance.
Rhythm: `--sec-gap --sec-gap-tight --sec-gap-hero --sec-pad --page-top`. Layout: `.wrap` (max 1360 + `--gutter`), `--radius 24px`, `--radius-lg 32px`.

## Classes (`components.css`, `@layer components`: your unlayered CSS and Tailwind win)
- Type: `.display .h1 .h2 .h3 .lede .body .small .caption .label .quote .tnum`. One wink word per headline: `<span class="wink">enormous</span>` (1.12em at display/h1, 1.08em below).
- `.hl` sun highlighter band, drawn by the reveal runner (`.is-in`). Max one per screen, never on a wink word (errors on the apply form may stack).
- Buttons: `.btn` + `.btn--ink | --cobalt | --ghost`, `.btn--sm | --lg`. Immobile on hover; press .97 in 100ms, release on `--spring`.
- Dot link: `<a class="dotlink" href="…"><span>Visit brand ↗</span></a>`; `.dotlink--quiet` (no resting line); `.dotlink--stretch` makes its `::after` cover the nearest positioned ancestor (whole card or row is the link; put controls above it with `z-index: 2`). Touch shows the gesture on `:active`.
- Chips: `.chip`, `.chip--sun` ("In market": its ground draws 250ms after its block reveals, then the dot pops), `.chip--line` ("Coming soon"). Never interactive.
- `.live-dot` is still; `pulse(dot)` rings once (`lib/live.ts`). `.live-dot--off` = outline, not live. `.card`, `.card--mist`, `.glass`, `.wordmark` + `.wink-amp`.
- `.swap > .swap__a + .swap__b` two-state label (`[data-copied]` or `[data-swapped]` on an ancestor). `.slot > [data-slot-item]` multi-state label, `setSlot(el, key)` (`lib/slot.ts`).
- Image arrival: `<div class="ph" style="--ph:url(<placeholder data URI>)"><img data-decode …></div>`; `decodeFade(root)` (`lib/media.ts`, boot runs it once on the page).
- Shells: `.section`, `.section--tight`, `.section--first`, `.surface-ink`, `.surface-mist`, `.surface-raised`, `.rule`. Print: `[data-print="hide"]` hides an element on paper.

## Reveals (`lib/reveal.ts`, started after the intro lands; content stays visible without JS)
`data-reveal` (text-sized: rise 16px + fade, + blur 6px on fine pointers >= 768px) · `data-reveal="rise"` (cards, panels, rows, groups: never blur) · `="wipe"` (images, inner `img/picture/video/.media` 1.08 to 1) · `="fade"` · `="scale"` ·
`data-stagger="70"` cascades its `data-reveal` children (`data-base`), capped at 6 (child 7+ share child 6's delay) · `data-lines` masked line rise (`data-step`), headlines only; adds `.landed` (masks stop clipping) and fires `lines:landed` on the element · `data-odo` odometer · `data-delay="200"` ms.
Budget: three beats per section (label + headline, lede, content block). Reveals hold during anchor jumps; a restored scroll shows everything above the fold at once. `revealAll(root, instant?)`.

## Lib
- `motion.ts`: `EASE`, `easeExpoOut(t)`, `DUR` {press, spring, micro, ui, enter, line, image, imageInner}, `STAGGER`, `STAGGER_CAP`, `INTENT` {navHover 0, listHover 120, cardMoment 150, tooltipOpen 120, tooltipClose 200, prefetch 70, eggDwell 800} ms, `SPRING.touch` [320, 26] (anything touched), `SPRING.follow` [170, 22] (pointer followers), `SPRING.lens` {lead [620, 40], trail [190, 24]} (droplet lenses only), `springEase(k, c)` / `springTween('touch'|'follow')` → `{ ease, duration }` for gsap, `reducedMotion()`, `finePointer()`, `isMobile()`, `allowBlur()`. (`SPRING.soft` is a deprecated alias of `follow`; `snappy` is gone.)
- `spring.ts`: `Spring(value, k, c)`, `clamp`, `lerp`, `damp`, `loop(fn)` (stops when fn returns false).
- `lenis.ts`: `lenis`, `onScroll(fn)`, `scrollToTarget(el|selector|y, { onComplete })` (expo, 0.6 to 1.4s by distance), `isProgrammatic()`, `onProgrammaticEnd(fn)`, `lockScroll(on)`, re-exports `gsap`, `ScrollTrigger`.
- `split.ts`: `maskedLines(el)` → `.play() .finish() .revert()`, `LINES_LANDED`. `odometer.ts`: `odometer(el).play() / .to('1,000,001+')`.
- `live.ts`: `pulse(dot, 1|2)`, `pulseOnEnter(dot)`, `whileVisible(el, (visible) => …)` (in view and tab visible: pause tickers and loops with it).
- `cursor.ts`: `pointer.subscribe((p, dt) => …)` with `x y sx sy vx vy speed inside fine`; `pointer.local(el)`.
- `bloom.ts`: `ICON_PATH`, `iconSVG()`, `buildPetals(svg)` → `{ petals, states, settle, split }`, `openPetals(p)`, `budPetals(p, amount | [n,e,s,w], { opacity, rotate, stagger, instant })` (1 open, .42 bud, on `SPRING.touch`), `petalLoader(cls)`. Tween `p.states` (never the groups) for scale, rotate, x, y: each writes its transform about the centre (21, 21) explicitly, so it is exact even under the preloader. No `svgOrigin`.
- `text.ts`: `cleanDashes(text)` (API text: em and en dashes become a comma). `reveal.ts` also exports `revealLater(el)` for fetched content.
- `.link-block` on a card or row holding a `.dotlink--stretch`: the pointer anywhere on the block gives the link its gesture (components.css).
- `roles.ts`: `getRoleState()` (cached `/api/role-state`), `cachedRoleCount()`, `bindRoleCount()` (boot runs it: `[data-role-count]` rolls, `[data-role-noun]`, `html[data-roles-state="loading|ready|zero|error"]`, window event `roles:state` {state, count}).
- `eggs.ts`: `playEgg(id, run, { throttle })` (one at a time, reduced-motion gate, marks found), `onTyped(word, fn)`, `onReturn((secondsAway) => …)`, `onDwell(el, fn, { ms >= 800, tap, stayOnMove, onLeave })`, `markFound(id)`, `foundEggs()`, `EGGS`, `EGG_TOTAL`. Ids: away, cycle, reorg, perch, wave, cities, console, bloom, print.
- `copy.ts` `copyText`, `bindCopy(btn)` · `slot.ts` `setSlot` · `media.ts` `decodeFade` · `prefetch.ts`, `print.ts` (boot wires them).

Window events: `egg:bloom` (E8, re-bloom your marks; the 404 bud listens), `egg:found`, `roles:state`, `print:before` / `print:after` (pause loops), `lines:landed` (on the headline).
Rules: transform/opacity/clip-path only; hover only under `(hover:hover) and (pointer:fine)`, touch gets `:active`; `reducedMotion()` = opacity only, no loops, no moving eggs; every rAF loop stops when settled, off-screen or hidden; no em or en dashes in copy.

## Example
```html
<section id="record" class="section" data-section="record">
  <div class="wrap">
    <p class="label" data-reveal>The record</p>
    <h2 class="h2" data-lines>In under 36 months, <span class="hl">profitably</span>.</h2>
    <ul class="grid grid-cols-3 gap-8" data-stagger="80">
      <li data-reveal="rise"><span class="label">Customers</span><span class="h1 tnum" data-odo>1,000,000+</span></li>
      <li data-reveal="rise"><span class="label">Revenue</span><span class="h1"><span data-odo>9</span> figures</span></li>
      <li data-reveal="rise"><span class="label">Elapsed</span><span class="h1">Under <span data-odo>36</span> months</span></li>
    </ul>
    <a class="dotlink" href="/careers" data-reveal data-delay="300"><span>See open roles</span></a>
  </div>
</section>
```
```ts
import './record.css'
import { pointer } from '../lib/cursor'
import { whileVisible } from '../lib/live'
export function init(root: HTMLElement): () => void {
  let off: (() => void) | null = null
  const stop = whileVisible(root, (on) => {
    off?.(); off = on ? pointer.subscribe((p) => root.style.setProperty('--px', String(p.sx / innerWidth))) : null
  })
  return () => { stop(); off?.() }
}
```

## Nav (v3, 2026-10-21: the compass; decision in `docs/nav-sketches/DECISION.md`)
- `src/chrome/nav.{html,css,ts}`. No capsule, no glass (`lib/glass.ts` is deleted; the `.glass` class in components.css stays for the brand-card pause buttons).
- Desktop (960px and up): a quiet line on the page grid, lockup in columns 1 to 5, Brands · People · How we work · Careers from column 7, "Open roles (15)" in cobalt with its live dot on the right. A petal bullet pops beside the current destination (`aria-current="location"` on home, `"page"` for Careers on /careers and apply).
- `nav[data-state]`: `top` (bare line), `band` (scrolled back up: solid band + hairline), `seal` (reading down: only the mark and the count stay, each on a solid seal). Hysteresis per MOTION-CHALLENGE 1.4. The mark and the count never move.
- The mark is the compass: the current section's petal full, the other three at 26% opacity; whole at the top, on hover and on focus (where it also turns 45deg cobalt). On home the lockup scrolls to the top.
- Below 960px the mark is the menu button (`.nav__menu` over it), the wordmark the home link. The menu (`#nav-panel`, inside the header) unfolds the mark's petals into four quarters, clockwise Brands, People, How we work, Careers; focus trapped, Escape and back close it, scroll locked through `lockScroll`. Without JS the links show as a row under the lockup.
- buildPetals() groups carry `.petal`; the chrome renames its own to `.cb-chrome-petal` (`chromePetals()` in nav.ts) so section CSS can never restyle the nav or preloader marks. Avoid a bare `.petal` selector in section CSS.
- The count: `[data-role-count]` in the line and the menu button are filled by `bindRoleCount()`; the nav only listens to `roles:state` (no second fetch). The preloader lands the mark on `.nav__icon` and draws the rest of the line in beside it.

## Clocks (`lib/clocks.ts`)
- `CITIES`: Hong Kong `Asia/Hong_Kong`, Shenzhen `Asia/Shanghai`, London `Europe/London`, San Francisco `America/Los_Angeles`, in display order.
- `cityTimes(now?)` returns `[{ city, tz, label }]`, `label` being the local time, 24h, `"20:14"`. `timeIn(tz, now?)` for one zone.
- `bindClock(el, tz)` makes `el` an odometer showing `HH:MM` for `tz` (tabular, `.tnum` added) and rolls only the digits that change on each minute. One shared timer aligned on the minute, refreshed when the tab comes back; returns a cleanup. Not driven by the reveal runner.
- The People map (`#places`) uses it for its city times. The hero no longer shows clocks (removed 21 Oct 2026 at Mehdi's request).

## Live tip (`lib/livetip.ts`)
- `bindLiveTip(dot, { selfTick = true })` turns a `.live-dot` into a real button (accessible name "Customer pace", `aria-describedby` to a `role="tooltip"` bubble appended to `body`, `position: fixed`, it follows the dot while open and flips below it near the nav).
- The bubble: "≈ {n} new customers today" (seconds since midnight in Hong Kong / 23), "≈ {m} since you arrived" (seconds since the visit started / 23; the start is kept in `sessionStorage` `cb-visit-start`, so it survives reloads in the tab), and the muted "At the average pace of one every 23 seconds." Numbers are odometers. `paceEstimates()` exports the two values.
- Opens after 120ms of hover intent (`INTENT.tooltipOpen`), at once on keyboard focus or tap; closes on leave (200ms), blur, Escape or a tap outside. Enters on the `--spring` (SPRING.touch), exits in 40% of that. Reduced motion: opacity only.
- Ticking: with `selfTick` (default) it updates every 23 s of the visit while open. A section that already has its own "+1" passes `{ selfTick: false }` and calls `tip.tick()` with each "+1", so the numbers roll in step with it (the hero does). Returns `{ tick, open, close, destroy }`; call `destroy()` in your cleanup.
- Styles in `lib/livetip.css`, tokens only (`--paper-2`, `--ink`, `--muted`, `--line`, `--ink-rgb`, `--accent`, `--spring`), so themes apply without changes. The counter's total is never touched.

## Companions (`lib/companion.ts`)
The lemon's behaviour (MOTION-CHALLENGE 1.20) as an engine, for any zone that wants a cursor companion. Used by the brand cards; the lemon in `work.ts` still has its own copy and can migrate later.
- `createCompanion(zone, { sprite, frames, frameSize, size, rest, onEgg?, flavour?, svg?, offset?, reading?, perch?, feet?, avoid?, body?, onGround?, className? })` → `{ el, hold(on), hop(), state, face(x), destroy() }`. It appends one `aria-hidden`, `pointer-events: none` element to `zone` (z-index 3, styled inline, no section CSS needed) and lives inside the zone only.
- Sprite: `${sprite}-${frameSize}.webp` (1x strip) and `${sprite}-${frameSize * 2}.webp` (2x), one row of frames; `${sprite}-violet-…` under `html[data-theme="violet"]`, swapped on `theme:change`. `size` is CSS px or `(zoneWidth) => px`. `rest(zoneRect, size)` returns the box's top-left in zone px.
- Flavours. `roll` (default): `SPRING.follow` per axis, offset 18px from the cursor, frame = distance / (π × 0.72 × size / frames), tilt with speed, the `hop()` impulse; touch idles with one frame every 400ms. `turn`: same follow with a vector `svg` (painted `currentColor`) rotating continuously with distance. `hop` (a bird): ballistic hops of at most ~1.1 × size towards a spot beside the cursor, wing frames 2, 3, 4, 3 in the air, a 70ms crouch (frame 1) before take-off, frame 0 standing; after 800ms of pointer stillness (`INTENT.eggDwell`) it flies to `perch(zoneRect, size, pointer)` and stays until the pointer moves; touch idles with a small hop every 2.6s.
- `onEgg(e)`: `turn` {secs} for each full turn of the frames (the E2 hook), `perched` {at} / `flew` for a hop companion, `show` / `hide`.
- One companion is visible page-wide: the one whose zone holds the pointer; on touch or under reduced motion, the one whose zone is most in view (50%+). Leaving: it glides back to `rest` and fades (opacity after 260ms). `reading` (a selector in the zone): over those it steps back to 40%. `hold(true)` sends it home and hides it until `hold(false)`: the brand cards hold it while their own moment leads.
- **Never on the product (BRAND 3).** `avoid(zoneRect, size)` returns forbidden rects in zone px; `body` is the visible body inside the box (fractions, facing right). The cursor target is clamped out of them, so over a zone the companion waits at the nearest allowed spot; a roller is pushed out along the edge it meets (it never rolls across); a hopper checks each hop on its arc and routes over the top edge (the `perch` line, always allowed) when a hop would cross, or waits; the rest spot is clamped too. The brand cards feed it from the registry: `BrandImage.avoid` (normalized rects around the product and the hand, required on every gallery image; `[[0, 0, 1, 1]]` for a photo that is product or body throughout) for the image on screen and the one fading out. `/?companion-zones` outlines them; `frames.mjs zones` shoots each image, `frames.mjs guard` sweeps and parks the cursor on every product and must report 0 overlapping samples.
- Violet: `onGround(x, y, size)` says where the companion is off the photo. Over a photo it keeps the paper print (photos keep their colours); on the page ground it crossfades (500ms) to the `-violet` print, which loads only in violet mode.
- Off screen (IntersectionObserver on the zone): no pointer subscription, no frame computed; hidden and home: nothing is painted. Reduced motion: static at `rest`, frame 0.
- Sprites: `scripts/companions/build.py` (sources in `scripts/companions/src/`, made with `gen.mjs` on Gemini: fruit and birds only, never a product or a label). It cuts the subject out of its flat ground, tones it, poses or turns it in continuous tone and only then screens it with the lemon's own 45° clustered-dot screen (lattice (2,2) (2,−2) at 2x, black dots on an opaque white body), so the dots never turn with the subject and match the lemon's on screen. Violet prints match `lemon-sprite-violet-360` (lavender `#D9D2F5` dots at 60%, a 10% body veil).
- Registry: `BrandEntry.companion` (`CompanionSpec`: `sprite`, `frames`, `frameSize`, `size`, `flavour`, `feet?`), `'none'` for no companion, omitted for `DEFAULT_COMPANION` (the Care & Bloom petal, `turn`, 64px). `resolveCompanion(b)` gives none to a card that is not a live link. Review frames with `BASE=http://localhost:4189 OUT=<dir> node scripts/companions/frames.mjs desktop|touch|reduced|perch`.

## Theme: violet mode (2026-10-21; `docs/BRAND.md` "Violet mode", per-file list in `docs/VIOLET-SWEEP.md`)
- `<html data-theme="light|violet">`, set before first paint by the head script of each page (stored `cb-theme`, else `prefers-color-scheme: dark` = violet). The tokens keep their roles and change value under `[data-theme="violet"]`: write `var(--ink)`, `var(--paper)`, `var(--cobalt)` for their role and it switches. Hex values in section CSS do not.
- New tokens: `--night` (ground of `.surface-ink`), `--on-sun` (type on sun, always dark), `--on-cobalt`, `--ink-hover`, `--cobalt-hover`, `--cobalt-on-ink-hover`, `--shadow-rgb` (shadows; `--ink-rgb` turns lavender), `--fixed-ink`, `--fixed-paper`, `--fixed-ink-rgb`, `--fixed-paper-rgb` (over photos), `--hl-y`, `--hl-h`, `--hl-fg` (highlighter geometry and type).
- `lib/theme.ts`: `getTheme()`, `onTheme(fn)` (window event `theme:change`, `{ theme }`), `setTheme(t, { from })`, `toggleTheme(from)`, `themedSrc(url)`, `themedSrcset(s)`, `THEME_COLOR`, `FLOOD_MS`. Images: `.theme-only-light` / `.theme-only-violet` siblings with `loading="lazy"`.
