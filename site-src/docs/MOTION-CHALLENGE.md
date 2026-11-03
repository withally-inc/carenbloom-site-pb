# Care & Bloom v4: motion challenge

Phase one, 21 October 2026. Interaction and motion direction for every micro-interaction on Home, /careers and /careers/apply, written before the section builds start. A second pass will challenge the built site against this file.

How to read it: section 0 is the house system every item refers to. Section 1 gives a verdict on everything already designed or built (BRIEF section 5, BRAND section 11, FOUNDATION and the code in `src/lib` and `src/chrome`). Section 2 adds what is missing, and lists what was rejected. Section 3 is the easter eggs. Section 4 is the brand registry that drives the brand cards for 2 to 10 brands. Section 5 maps every kept item to a file and a priority, and lists the foundation changes for the main session to route.

Sketches that make the trickiest items unambiguous live in `docs/motion-sketches/` (open the HTML files directly in a browser; images and fonts load from `public/`):
- `nancy-roll.html`: the Hello Nancy card moment (fruit window rolling in, registered to the card).
- `biird-ii.html`: the Biird tittle hop and the "perch" egg.
- `values-lens.html`: the values tablist with the vertical droplet lens, the card swap, and the "(re)org" egg.

Every value below is final unless marked "verify at second pass".

---

## 0. The house system

### 0.1 One curve

`expo.out`, CSS `cubic-bezier(.16,1,.3,1)` (`--ease`, `EASE`). Everything that enters, swaps or settles uses it. Two allowed exceptions, both already in the code and both justified:
- `expo.inOut` for an object travelling between two fixed points (the preloader mark flying into the capsule).
- `linear` for anything that represents time (gallery progress bars, the countdown).

Rejected: `power2.inOut` on the preloader curtain (replace with the house curve, 0.55s), the quartic easing in `lenis.ts scrollToTarget` (replace, see 1.27), `elastic` anywhere (the melriver Swiss egg uses it; it would read as a toy here).

### 0.2 Durations (the only ones)

| Token | Value | Use |
|---|---|---|
| `--dur-press` | 100ms, `ease-out` | Press scale down to .97 |
| `--dur-spring` | 430ms, `var(--spring)` | Release from press, petal pops, icon flips: anything CSS-sprung |
| `--dur-micro` | 300ms | Colour, background, border, small opacity changes |
| `--dur-ui` | 500ms | State swaps: accordion content, card content, label slots, nav tone |
| `--dur-enter` | 1.1s | Reveals, masked lines, odometer rise |
| image | 1.2s wipe, 1.4s inner scale | Image wipes |
| exit | 40% of the matching entrance, house curve | Anything leaving: 180ms for a 500ms swap, 300ms for a sheet |

Nothing else. If a builder needs 700ms, they use 500ms or 1.1s.

### 0.3 One spring for touch, one for following

The code today has six spring settings (`320/26`, `170/22`, `620/40`, `190/24`, `600/44`, `260/15`) and a CSS `--spring` with 9% overshoot that matches none of them. That is not "one spring". The set becomes:

| Name | Stiffness / damping (mass 1) | Damping ratio | Overshoot | Settles | Use |
|---|---|---|---|---|---|
| `SPRING.touch` | 320 / 26 | 0.73 | 3.5% | ~430ms | Everything a person touches: nav mark turn, press release, petal pops, card moments, values lens rows, eggs |
| `SPRING.follow` | 170 / 22 | 0.84 | 1% | ~600ms | Things that trail the pointer: the lemon, card media shift |
| `SPRING.lens` | leading edge 620 / 40, trailing edge 190 / 24 | | | | The droplet lens only (nav tabs, nav hover pill, values list). Two edges of one object: this is the effect, so it is the one documented exception |

Delete `SPRING.snappy`, the icon's `260/15` (19% overshoot: an 8.5 degree wobble on the logo, cheap) and the hover pill's `600/44` (use the lens leading-edge values).

The CSS spring must be generated from the same 320/26 so CSS and JS feel identical. Replace `--spring` in `tokens.css` with this (430ms duration, 3.5% peak, computed by integrating the spring):

```css
--spring: linear(0, 0.0347 3.6%, 0.1157 7.1%, 0.2230 10.7%, 0.3458 14.3%, 0.4651 17.9%, 0.5811 21.4%, 0.6818 25%, 0.7714 28.6%, 0.8456 32.1%, 0.9031 35.7%, 0.9477 39.3%, 0.9819 42.9%, 1.0058 46.4%, 1.0210 50%, 1.0300 53.6%, 1.0344 57.1%, 1.0351 60.7%, 1.0335 64.3%, 1.0303 67.9%, 1.0263 71.4%, 1.0220 75%, 1.0178 78.6%, 1.0139 82.1%, 1.0104 85.7%, 1.0075 89.3%, 1.0050 92.9%, 1.0030 96.4%, 1);
--dur-spring: 430ms;
```

### 0.4 Intent delays

| Where | Delay | Why |
|---|---|---|
| Nav hover pill | 0 | Feedback must be instant on a nav |
| Values list hover | 120ms | Passing over rows on the way to the card must not flip the card |
| Brand card moment | 150ms | Passing over a card on the way down the page must not throw fruit |
| Tooltip open / close grace | 120ms / 200ms | Standard hover-intent for a popover |
| Prefetch on hover | 70ms | Roster's value: cheap, avoids prefetching every link the cursor crosses |
| Egg dwell triggers | 800ms minimum | An egg needs a deliberate gesture, never a pass-over |

### 0.5 Gating and budgets

- Hover effects only under `(hover:hover) and (pointer:fine)`. Touch gets `:active` states instead (designed, see 2.2).
- Reduced motion: opacity only, no ambient loops, no eggs that move. The full matrix is in 0.7.
- **No `filter: blur()` on coarse pointers or under 768px.** The reveal blur (rise + blur 6px) re-rasterises every frame; ten text blocks blurring at once in a stagger costs a mid-range Android its 60fps. On mobile, reveals are rise + fade only. On desktop, blur only on text-sized elements (labels, ledes, captions, list items), never on cards, images or containers. See 1.5.
- At most one ambient loop visible above the fold (the breathing ampersand). The live dot is not a loop any more (1.8).
- Every rAF loop stops when settled (the code already does this for springs: keep it) and when its element is off-screen (IntersectionObserver) or the tab is hidden.
- Measurement for the second pass: Chrome Performance panel at 6x CPU throttle on the 390px viewport, no long tasks over 50ms during scroll, no dropped frames during the hero scrub; plus a 120Hz Mac for spring feel.

### 0.6 The meaning test

Every motion below answers one question: what does it tell the visitor that a still page would not? Kept motions say "this is live" (cobalt, the counter), "this is clickable" (dot, lens), "this is the brand" (bloom, ampersand, lemon), or "your action worked" (copy, submit). Anything that only says "we have a motion library" is cut.

The egg rule (section 3): eggs never trigger on a pass-over hover of something that is not clickable, because that would break BRIEF rule 3 for every casual visitor. They trigger on deliberate gestures: a dwell of 800ms or more, stillness, a repeat activation, typing, a gesture (a wave), or leaving and coming back.

### 0.7 Reduced-motion matrix

| Item | Reduced motion |
|---|---|
| Preloader | Skipped (already) |
| Reveals, masked lines, wipes | Opacity 0 to 1, 400ms, no transform, no clip |
| Odometer | Final value, opacity fade (already) |
| Breathing ampersand | Static |
| Live counter "+1" | Not shown; the caption "+1 ≈ every 23 s" carries the claim; dot static |
| Hero rose | The end frame (the bloom) shown static, no scrub |
| Nav lens, values lens | Jump to target, no spring (already for the nav) |
| Nav compact | Instant swap, no fold animation |
| Brand galleries | No autoplay; arrows/pause still work with a 200ms crossfade |
| Brand card moments | Off |
| Lemon | Static at its rest spot, frame 0 |
| Accordion | Instant height, content fades 200ms |
| Portrait develop | Plain 300ms crossfade on hover/focus |
| Eggs | Off, except the console note (E7) and the print line (E9), which do not move |
| Route fade | Off |

---

## 1. Verdicts on everything already designed

Format: **Verdict.** What is wrong, then the spec to build.

### 1.1 Nav capsule and lens: KEEP, improve four details

The droplet lens (two edge springs, inverse label copy clipped to the lens) is the best piece of motion in the foundation. Keep it exactly. Fix:

1. **Spy hysteresis.** `scrollSpy` sets `null` the moment no `[data-spy]` section crosses the line. Between Brands and People sits Spaces, between People and the footer sits How we work: the lens fades out and back in twice per scroll down, which reads as a glitch. Spec: Spaces gets `data-spy="brands"` (it is the brands' categories). For the remaining gaps, a `null` is applied only after it has persisted 400ms; any non-null value applies immediately. When the lens does hide, it fades in place over 300ms (current behaviour), never slides home.
2. **Hash landing.** Arriving on `/#people` or `/#brands` (from careers, or the footer links), the lens must render at the right tab on the first frame (`aim(i, true)`), not slide in from Brands while the page scrolls.
3. **Lens travels across pages.** Clicking "Careers" on home: call `setActive('careers')` on `pointerdown` (not click), do not `preventDefault`. The lens starts its droplet move during the 100 to 300ms before unload; the careers page renders the lens on Careers instantly. Same in reverse for Brands and People from careers. Zero added latency, and the capsule feels continuous across documents.
4. **Lens width.** `lens.style.width` changes every frame, which is a layout per frame. It is scoped to one absolutely positioned element and the tabs are hidden under 768px, so it is acceptable: add `contain: layout style` on `.tabs` and leave it. Verify at second pass.

### 1.2 Brand mark in the nav (45 degree turn): KEEP, fix the spring

Turn to 45 degrees and cobalt on hover and focus, on `SPRING.touch` (was 260/15). Colour change 300ms house. On the ink section (see 2.6) the hover colour is `#6F7CFF`. Clicking the mark while already on home at the top: nothing. Clicking it while scrolled on home: scroll to top (see 1.27 easing) instead of a reload.

### 1.3 "Open roles (15)" pill: IMPROVE

- The count arrives from the API after first paint. Today the text just changes. Spec: the HTML ships "Open roles" plus a `.fold` holding " (15)" collapsed at `0fr` while loading; when the count resolves, the fold opens (`grid-template-columns` 0fr to 1fr, 600ms `--ease-drawer`, the existing technique) and the digits land with `odometer(el).to(n)`. If the cached value equals the API value, no roll.
- Error: the fold stays closed, `aria-label` per COPY.md.
- Hover: background `#1825c4`, 300ms. Press .97. Never moves otherwise. Keep.

### 1.4 Compact on scroll: KEEP, replace the trigger

`Math.abs(y - lastY) > 4` per scroll event flips on trackpad inertia jitter and on Lenis micro-corrections. Spec:
- Compact when the visitor has scrolled down 24px cumulatively since the last direction change, and `y > 120`.
- Expand when they have scrolled up 48px cumulatively, or `y < 80`, or keyboard focus enters the nav (`focusin`), or the pointer enters the top 72px of the viewport (desktop only, 0 delay).
- Ignore scroll deltas while a programmatic scroll is running (anchor jumps), then evaluate once on landing.
- The fold itself (600ms `--ease-drawer`) stays. Under reduced motion the swap is instant.

### 1.5 Reveals (rise 16px + blur 6px + fade): IMPROVE

Generic as a default, and expensive where it is used most. Spec:
- `data-reveal` (default): desktop fine pointer: rise 16px, blur 6px to 0, opacity, 1.1s. Under 768px or coarse pointer: rise 16px and opacity only (no `filter` at all in the CSS for that media query).
- New `data-reveal="rise"`: rise + fade, never blur. Builders use it on any card, panel, row or group larger than about 600 by 200px.
- Stagger groups cap at 6 animated children: child 7 and after share child 6's delay. A list of 15 role rows does not cascade for a full second.
- **Beat budget per section: three.** Label and headline (one beat), lede (second), content block (third). Not every paragraph, chip and caption reveals on its own: they ride with their block. This is what separates the record of a nine-figure group from a template where everything drifts up.
- Reveals hold during a programmatic scroll (anchor jump) and fire on landing; otherwise the content in the destination plays its entrance mid-flight, unseen, and arrives static.
- Back/forward with a restored scroll position: everything above the restored viewport bottom is marked in instantly (`transition: none` for that frame).

### 1.6 Masked line rise: KEEP, two fixes

The SplitText masks with 2.5 degrees from bottom-left and padded masks are right. Fix:
- After a headline lands, its masks must stop clipping: add a `landed` class on complete that sets `overflow: visible` on `.line-mask` (or revert the split for headlines that never re-split). Otherwise the breathing ampersand (1.06 scale) and any hover on a wink word get cut, against BRIEF rule 10.
- Headlines only. Ledes, body and lists use reveals. Two motion languages for text, never three.

### 1.7 Image wipes: KEEP

Clip-path from the bottom 1.2s, inner scale 1.08 to 1 over 1.4s. The rounded corners survive because the parent's `overflow: hidden` and radius intersect the clip: verified by reading the CSS. One rule: never wipe an image that is also about to autoplay (brand galleries start cycling only 1.6s after their wipe ends).

### 1.8 Live counter and "+1 every 23 s": REPLACE the loop, keep the claim

Today `.live-dot::after` rings every 2.4s forever: a second permanent loop above the fold (BRIEF allows one, the ampersand), and a pulse with no meaning, since nothing happens on it. Spec:
- **The dot is still between ticks.** It is the clock: it moves only when the clock ticks.
- **Tick:** the ring (`::after`) scales 1 to 3.2 and fades .55 to 0 over 1.2s house curve, once. At the same moment the "+1" (label size 12px, PP Mori 600, tabular, cobalt, `aria-hidden`) rises from the dot: `translateY(4px)` to `translateY(-18px)`, opacity 0 to 1 over the first 25% then hold, then opacity to 0 over the last 40%, total 1.6s, house curve. Scale .9 to 1 on the way up.
- **Rhythm:** first tick 2.4s after the odometer lands (so every visitor sees one), then every 23s.
- The ticker pauses when the counter is off-screen and when the tab is hidden; on return it resumes the 23s rhythm with no catch-up burst (except the egg E1, which is one deliberate chip).
- Never touches "1,000,000+". The total is a claim cap.
- No `aria-live`: a polite announcement every 23 seconds would be unbearable for a screen reader. The group's static `aria-label` carries both claims.
- Reduced motion: no "+1", dot static.
- The same rule for every live dot on the site: the footer and careers live dots pulse once when their data resolves, and once when they scroll into view. Never on a loop.

### 1.9 Breathing ampersand: KEEP, sharpen the breath

- CSS keyframe on the hero `&` (`.wink-amp` inside the h1), 5s, `infinite`, timing `cubic-bezier(.37,0,.63,1)` (sine in-out: a breath is not an entrance, so this is a loop curve, not the house curve).
- Keyframes: `0% { transform: none } 44% { transform: scale(1.06) rotate(-2deg) } 100% { transform: none }`. Inhale 2.2s, exhale 2.8s, a single lean back rather than a side to side wobble. `transform-origin: 50% 78%` (the glyph's lower bowl, so it breathes upward from the baseline).
- Starts 400ms after the h1 has landed (and after `landed` removed the mask clip, see 1.6), from the rest pose, so there is no pop.
- `animation-play-state: paused` while the hero is off-screen (one IntersectionObserver), automatically paused in hidden tabs.
- `will-change: transform` only while running.
- Not hoverable: it is not a link.

### 1.10 Hero rose scrub: KEEP the idea, specify the engine

> As built (see `docs/MOTION-REVIEW.md`, passes 2 and 3): 49 frames (every second frame of the 97-frame source) loaded in order after the poster, drawn 1:1 on a 538 x 720 canvas, kept as ImageBitmaps; on a first visit the rose is painted under the bloom curtain (the LCP fix); violet frames re-inked with pure sun dots. The values below are the original spec.

The bloom plays with the first 40vh of scroll, reversible. Spec:
- **LCP:** `hero-start-896.webp` is the `<img>` with `fetchpriority="high"`. A `<canvas>` of the same box sits on top, transparent until the sequence is ready.
- **Frames:** the 24-frame WebP sequence (`bloom-seq/bloom-00..23.webp`), not video `currentTime` (seek jank, Safari). Loaded after `load` in `requestIdleCallback`, coarse to fine order (0, 23, 12, 6, 18, 3, 9, 15, 21, then the rest), so an early scroll always has a near frame. Under 768px load the even frames only (12 frames, about 290 KB). `saveData` or 2g/3g: no sequence, crossfade `hero-start` to `hero-end` by progress.
- **Mapping:** `p = clamp(scrollY / (0.4 * innerHeight), 0, 1)`, smoothed `ps = damp(ps, p, 12, dt)` on the GSAP ticker, `f = ps * 23`. Draw frame `floor(f)` at alpha 1 and frame `ceil(f)` at alpha `f % 1` (24 frames over about 360px would otherwise step every 15px on a slow scroll). Redraw only when `f` changes by more than 0.01. Canvas backing size: displayed size times `min(devicePixelRatio, 2)`.
- No parallax, no scale on the rose: the bloom is the motion.
- Reduced motion: the end still (the flower open), because the name is Bloom.
- The ticker unsubscribes once the hero is fully off-screen and resubscribes on return.

### 1.11 Hero entrance sequence: SPECIFY (it is the first impression)

> As built: an authored 2s load sequence with the rose blooming through every stage, live city clocks in the dock and a live tip on the counter dot. On a first visit the curtain dissolving is the rose's entrance (it settles from 1.08); the figure stays hidden until its odometer plays. See `docs/MOTION-REVIEW.md`.

t = 0 is the moment the intro lands (or page ready on repeat visits).
- 0.00s: "Care", "&", "Bloom" rise from their masks as three words (SplitText `words` inside line masks), 1.1s, 90ms apart.
- 0.20s: rose `hero-start` wipes up (1.2s).
- 0.35s: the brand line, three lines (one sentence each, forced breaks), masked line rise, 85ms stagger.
- 0.60s: odometer plays.
- 0.75s: counter caption, dot, cities: one reveal beat.
- 0.90s: "See the record" dot link.
- +0.4s after the h1 lands: ampersand starts breathing.
- 2.4s after the odometer lands: first "+1".

### 1.12 Odometer: KEEP

The port is right: left digits first, last 3 to 5 steps, neighbours never in lockstep, plain value kept for screen readers. No hover re-roll (numbers are not clickable). Reuse it for every number that changes: role counts, the values counter "03 / 07", the countdown's minutes and up (2.12).

### 1.13 Dot links: KEEP, three additions

- Dot pop uses the new `--spring` (430ms), label push 550ms house, underline draws from the left and retracts to the right: keep.
- Touch: `.dotlink:active::before { transform: scale(1) }` and the label push under `(hover: none)`, so a tap shows the brand's link gesture during the press.
- Focus: the dot and underline show (already) and the cobalt ring stays (WCAG 2.4.7); give the ring `border-radius: 6px`.
- Rejected: an arrow nudge on ↗ and →. One gesture per link.

### 1.14 Buttons: KEEP, add the release

Immobile on hover, colour only (300ms), press `scale(.97)` in 100ms ease-out. Add: release springs back with `transition: transform var(--dur-spring) var(--spring)` (only the press uses 100ms). It makes a still button feel alive without breaking rule 2. Disabled: opacity .5, no transitions.

### 1.15 Chips: IMPROVE (the sun is a highlighter, so draw it)

"In market" (sun): when its card or row reveals, the sun ground draws left to right like the `.hl` band (`background-size` 0% to 100%, 700ms house, 250ms after the block reveal), then the ink dot inside pops (`scale` 0 to 1, `--spring`). "Coming soon" (line): static. Chips are not interactive: no hover, ever.

### 1.16 Brand cards: IMPROVE (detail in section 4)

- **Whole card is one link** (stretched link: the "Visit brand ↗" dot link's `::after` covers the card; the pause button sits above it with `z-index`). Hovering the card shows the dot link's hover state, so the affordance is honest, and card hover becomes legal under rule 3.
- **Gallery cycle:** 6s per image (5s is too fast to read a photo and two cards flipping in sync looks mechanical). Cards are phase-offset by `index * 6s / n`, so no two flip together. Crossfade 900ms house, incoming image settles `scale(1.04)` to 1 over 1.4s. Cycling runs only while the card is at least 50% in view and the tab is visible, and starts 1.6s after the image wipe.
- **Progress:** one 2px segment per image at the top inside the card (16px inset, 4px gaps), paper at 40% with a paper 95% fill that grows `scaleX` 0 to 1 linearly over the interval. Tells the count and the time.
- **Pause control** (WCAG 2.2.2): a 32px glass circle bottom right inside the card, pause bars morph to a play triangle (two path states, 300ms), labels per COPY.md. Hover or focus inside the card pauses the timer and holds the bar.
- **Cursor media shift:** media moves toward the pointer, max 8px, on `SPRING.follow`. The media layer is at `scale(1.025)` under fine pointers so an 8px shift never shows an edge. Off under reduced motion and on touch.
- **The card never moves, lifts or scales.** Its media and its moment do.
- **Brand moment** on hover (150ms intent) and on keyboard focus: see section 4.

### 1.17 Spaces accordion: IMPROVE

- Single-open (opening one closes the other in the same frame), so the page height barely changes and nothing below jumps by a full panel.
- Height: `grid-template-rows` 0fr to 1fr, 600ms house on open, 360ms on close. It is a layout animation, accepted for one element at a time; call `ScrollTrigger.refresh()` on `transitionend`.
- Content: on open it fades in and rises 8px, 500ms, 80ms after the height starts; on close it fades out in 150ms before the height closes.
- Indicator: a 14px plus made of two 1.5px bars; the vertical bar `scaleY` 1 to 0 on open, `--spring`. Not a petal: the mark's motion is reserved.
- **The petal indicator (new, P1):** in the section's left label column, a 40px mark built with `buildPetals`. One petal per space, N/E/S/W in accordion order. A space with a brand in market shows its petal open, ink; a coming-soon space shows a bud (petal `scale(.42)`, opacity .35). Opening a row: in-market petal turns cobalt (live); coming-soon petal grows to `.62` on `SPRING.touch`, closing returns it. Today the mark is one quarter open, which is the true state of the group, and when Longevity launches its petal blooms from the registry with no new code (section 4). This is a frame of the bloom, so it stays inside the mark's allowed motion (BRAND 5).
- Keyboard: `button[aria-expanded]` per row, Enter/Space toggle, Up/Down move between headers, Home/End. Rows at least 56px tall for touch.

### 1.18 People portraits: REPLACE the hover crossfade with a develop

A flat crossfade from the ink print to the cobalt print flashes a bright square inside the one dark section. Spec:
- The whole person block is one link to LinkedIn (stretched link), so hovering it is legal.
- Hover or focus: the cobalt portrait sits above the ink one and is revealed by `clip-path: circle(r at x y)` growing from 0 to 150% over 700ms house, centred where the pointer entered the portrait (keyboard focus: the centre). The duotone develops from the touch point, like ink spreading on a print. Leave: the circle shrinks to the exit point, 450ms.
- Touch: ink print only, no develop (no hover). The link works on tap.
- Reveal: the ink print wipes up like every image.
- Reduced motion: 300ms crossfade on hover and focus.

### 1.19 Values list and card: IMPROVE (see `values-lens.html`)

- Semantics: vertical `tablist` (rows are `role="tab"`, roving tabindex), the card is the `tabpanel`. Up/Down/Home/End, Enter/Space, click, hover with 120ms intent.
- **The lens:** the nav's droplet turned 90 degrees: a mist pill behind the active row, two edge springs (`SPRING.lens`). In the build, use a fixed-height pill with `scaleY` from a top origin (rows are equal height), not `height` per frame as the sketch does. The active row's number turns cobalt.
- **Card swap, direction-aware:** outgoing name and sentence fade and move 8px toward the direction of travel in 180ms; the incoming name rises 12px from the other side and fades in over 500ms, the sentence 60ms later. Moving down the list, content enters from below; moving up, from above.
- **Counter** "03 / 07" rolls with `odometer.to`.
- No autoplay: these are sentences to read.
- **Mobile (< 768px):** the list collapses; the card shows with Previous / Next buttons (copy exists), a horizontal swipe (pointer events, 48px or 0.4 px/ms to commit, the card follows the finger at 1:1 then springs), and seven 6px dots, active one cobalt.
- The lemon reacts to each change (1.20).

### 1.20 The lemon: KEEP (it is the joke), specify it fully

- **Where:** How we work only. 180px on desktop (360 sprite on DPR 2+), 120px between 768 and 1100px. `aria-hidden`, `pointer-events: none`, behind the text layer (text stays on top and readable), above the section ground.
- **Follow:** position follows the damped pointer on `SPRING.follow` per axis, offset 28px right and 28px below the cursor, so it never sits under the cursor or hides what is being pointed at. The native cursor stays visible: the lemon is a companion, not a cursor replacement.
- **Rolling:** frame = `floor(distanceTravelled / 28px) mod 10`, incremented when moving right, decremented when moving left. The rotation is physical: a lemon that travels further turns further. Tilt `rotate = clamp(vx * 0.015, -12, 12)` degrees on the same spring.
- **Enter:** when the pointer enters the section, the lemon leaves its rest spot and joins the cursor (500ms, spring). **Leave:** it glides back to its rest spot (bottom right of the values card) and settles. It is visible at rest from the start, so the section never looks empty and touch users see it.
- **Values change:** a hop (`translateY` impulse of -10px on `SPRING.touch`) and three extra frames over 300ms.
- **Touch:** idle at the rest spot, frames step every 400ms (a 4s stepped turn, the v3 stop-motion rhythm), only while in view.
- Performance: one element, `translate3d` plus a `background-position-x` step (a paint of a 180px box, cheap). Stops when the section is off-screen.
- Reduced motion: static, frame 0, at rest.

### 1.21 Player-coach model and lists: IMPROVE (quietly)

- Static content, no hover anywhere.
- The two columns reveal as one beat. The "Coach / Player" lists reveal in pairs (Coach 1 and Player 1 together, then 2, then 3, 80ms apart), which shows the pairing the copy describes.
- Bullets are the brand's petal bullet (BRAND 9: one petal, 0.5em, ink, rotated 45 degrees). On reveal each petal pops `scale` 0 to 1 and turns from 0 to 45 degrees on `--spring`. The one place the petal bullet appears on the site.

### 1.22 Footer statements: KEEP, small fixes

- "Join the *spaceship*." and "Start a conversation." masked lines: keep.
- The live count rolls (`odometer.to`) when the API answers; the live dot pulses once then (1.8).
- Loading / zero / error captions swap through the `.swap` slot (500ms), not a text replace.

### 1.23 Copy email: KEEP, fix the strings

The slot swap Copy to Copied (500ms) and the 1.9s hold are right. Fix `lib/copy.ts` announcements to the COPY.md strings: success "Email address copied.", failure "Could not copy. Select the address above.", button `aria-label` "Copy email address". On touch, keep both the mailto link and the Copy button (copying is useful on a phone too, unlike melriver's touch rule).

### 1.24 Closing bloom: KEEP

Scrubbed open as the footer enters, reversible, whole and seamless once fully open: right, and it is the bookend of the preloader. Keep `scrub: 1.2`. Not interactive (see 2.10 for an optional "back to top", which needs copy).

### 1.25 Preloader bloom: KEEP, two fixes

The 1.42s choreography (petals open N, E, S, W while the mark turns home from -45 degrees, flies into the capsule as the bar grows around it) is exactly the melriver intro done right. Fix:
- Skip on `wheel` and `touchstart` as well as `pointerdown` and `keydown`: a visitor who starts scrolling has told us they want the page (same `timeScale(6)` fast-forward, never a cut).
- The curtain fade uses the house curve (0.55s), not `power2.inOut`.

### 1.26 Mobile sheet: KEEP, tighten the exit

Full-height glass, links rising 700ms with 60ms stagger, foot at 260ms: good. Fix:
- Close: the links do not replay their stagger in reverse. On close, the spans go back to `translateY(110%)` in 300ms with no delay while the sheet fades in 300ms.
- Burger to cross: `--spring` at 430ms (the new spring), not 500ms with 9% overshoot.
- No clip-path reveal (it would switch off the glass in Chrome, as the preloader comment already notes).

### 1.27 Anchor scroll: IMPROVE

`scrollToTarget` uses a quartic ease over a fixed 1.3s. Spec: house expo out, `easing: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)`, duration by distance: `clamp(0.6 + distance / 4000, 0.6, 1.4)` seconds. Focus moves to the target after landing (already). Reduced motion: instant.

### 1.28 Careers list rows: IMPROVE (the row is a big dot link)

- Whole row is one link (as COPY.md says). Hover: the cobalt dot appears left of the title and pushes it 14px (the dot link at row scale), and the row's bottom hairline draws in cobalt from the left (`scaleX` 0 to 1, 550ms house) over the resting line. The arrow does not move. Same language as every link on the site.
- Touch: the same state on `:active`.
- Closed rows: muted, no hover, not a link.
- Group heading counts roll with the odometer when data arrives.
- Prefetch `/careers/apply/` on hover intent (70ms), touchstart and focus (2.4).

### 1.29 Careers loading, empty and error states: IMPROVE

- **Skeleton:** 8 rows (reserves space, so the real list mostly grows below the fold rather than shifting it), each a title bar and a caption bar in `rgba(ink, .06)` with radius 6px. A slow opacity breath .6 to 1, 1.6s sine, all rows in phase. No sweeping shimmer gradient: it is the most generic loading motion on the web.
- Label "Checking current openings…" with the petal loader (BRAND 9: four petals open in sequence, 1.2s loop) at 14px beside it. The one place a loop is allowed off the hero, and only while loading.
- **Data arrives:** skeleton fades out 180ms, real rows reveal (`data-reveal="rise"`, stagger 50ms, capped at 6).
- **Empty:** "No current openings." with the live dot replaced by an outline dot (not live), and the conversation link.
- **Error:** status text, "Try again" button; while retrying the button reads "Checking…", disabled, with the petal loader inside it at 12px, width locked to its idle width.

### 1.30 Apply form fields: IMPROVE

- Labels sit above fields, static. No floating labels: they shrink the label while the person types and hurt scanning.
- **Focus:** border colour line to ink-2 in 200ms, plus a 3px `box-shadow` ring in `rgba(cobalt, .22)` drawn outside the 1px border (paint only, no layout). That ring is the field's focus indicator; text fields show it on `:focus` (mouse or keyboard), other controls on `:focus-visible`.
- **Select** (country code, location): native select (the native picker is the best UI on phones), custom chevron, static.
- **Time zone options** (US, Europe, Asia): toggle pills, not checkboxes. Unselected: line pill. Selected: ink fill, paper text, a check that draws (`stroke-dashoffset` 12 to 0, 200ms) in a 12px slot that is always reserved, so the pill never changes width. Press .97. Space toggles. `role="checkbox"` semantics via a real `input type="checkbox"` visually hidden.
- **Tooltip** "?" for intro videos: opens on hover (120ms intent), focus or tap; `opacity` 0 to 1, `translateY(4px)` to 0 and `scale(.98)` to 1, 200ms house, origin at the trigger. Escape, blur or an outside tap closes it.

### 1.31 Validation: IMPROVE (no shake, use the highlighter)

- **No shake.** A shake says "you did it wrong" with the body language of a slammed door, and it is a vestibular trigger. Rejected.
- On a failed submit: the error summary opens at the top of the form (`grid-template-rows` 0fr to 1fr, 500ms), the page scrolls to it (1.27), and it takes focus.
- **"Check the highlighted fields"** (COPY.md) becomes literal: each invalid field's label gets the sun `.hl` band drawn left to right (700ms house), 60ms apart down the form, and its message appears below (fade + 4px rise, 300ms) with `aria-describedby`. The sun marks the evidence, here the evidence of what to fix. This is a documented exception to "one highlight per screen": errors may stack.
- When a field becomes valid (on input, after the first submit), its highlight retracts to the right (300ms) and the message fades.
- Field borders do not turn red: there is no red token, and the brand does not need one. Errors never rely on colour alone (the message text carries them).

### 1.32 File upload: IMPROVE

- Field: a mist box (radius 12px) with a "Choose file" ghost button and the "No file chosen" caption.
- Drag over (fine pointer): the border goes from line to cobalt and the ground from mist to white, 200ms. No new copy appears.
- File chosen: the filename row opens (`grid-template-rows`, 500ms) with "{filename} · {size}", Replace and Remove. Remove collapses it (360ms) and returns focus to the button.
- No fake progress bar: files are not uploaded until submit.
- Errors follow 1.31.

### 1.33 Submit and success: IMPROVE

- Submitting: the label swaps to "Submitting…" through the `.swap` slot, button width locked to its idle width, petal loader 12px inside, form `aria-busy`.
- **Success:** the form fades out (300ms), the container height animates to the success panel's height (measure, then `grid-template-rows`, 600ms), and the panel enters: a 40px mark blooms (`openPetals`, 0.8s, the preloader's motion), then "Application received." rises from its mask, the reference fades in. Focus moves to the heading. The one bloom on the apply page marks the one moment that matters to a candidate.
- Preview host: the status line only, no success choreography.
- Error: button returns to idle, status line per COPY.md.

---

## 2. Missing micro-interactions

Ranked. Everything here earns its place by the meaning test (0.6); the rejected list at the end matters as much as the kept one.

### 2.1 Focus-visible as a designed moment (P0)

- One ring everywhere: `outline: 2px solid var(--accent); outline-offset: 3px`, which follows the element's `border-radius` in current browsers; `#6F7CFF` on ink (already via `--accent`). Pills and chips get the full pill ring, dot links a 6px radius, cards their own radius plus 3px.
- It appears instantly. Focus never animates in: a keyboard user should never wait for the ring.
- Designed companions: the dot link shows its dot and underline on focus, the nav mark turns 45 degrees, the brand card plays its moment, the person block develops its portrait, the values lens moves. A keyboard visitor gets the same brand moments as a mouse visitor.
- Skip link: slides down from `translateY(-160%)` in 500ms house (exists). Keep.

### 2.2 Touch press states (P0)

`-webkit-tap-highlight-color: transparent` globally, then designed `:active` states under `(hover: none)`: dot links show dot and push; role rows show the dot and cobalt hairline; brand cards and person blocks dim their media to 92% opacity during the press; buttons and pills `.97`. Without this, a phone visitor gets either the grey system flash or nothing.

### 2.3 Route transition between home, careers and apply (P0)

- **No View Transitions API.** Roster tried it and removed it: a `view-transition-name` element is a backdrop root, which kills the header's glass blur, and crossfading two glass headers produces a visible double capsule. The same capsule exists here.
- The header is static HTML present in the first frame of every page and never animates between pages. Only the content fades in: an inline head snippet adds `html.pgt-fade` when `document.referrer` is same-origin and the navigation type is `navigate`; CSS runs `opacity: 0` to 1 over 240ms house on `body > :not(.nav, .skip-link, .sheet)`. Back/forward: no fade (bfcache restores instantly).
- Combined with the lens travelling on `pointerdown` (1.1, point 3) and prefetch (2.4), home to careers feels like one app without the cost.
- The preloader never runs on an internal navigation (session flag, already).
- Reduced motion: no fade.

### 2.4 Prefetch on intent (P0)

Speculation rules (`prefetch`, eagerness `moderate`, same-origin `/careers*` and `/`) where supported; elsewhere `<link rel="prefetch">` injected on hover after 70ms, on `touchstart` and on `focusin`. `/careers/apply/` is one HTML file for every role, so it is fetched once. `getRoleState()` is already cached, so the careers list can render from cache on arrival (no skeleton flash when the visitor came from home and the count call has already run).

### 2.5 The 404 moment (P1)

"This page never *bloomed*." The mark above it is shown as a bud (all four petals at `scale(.42)`, opacity .5, rotated -45 degrees). On load it tries once: petals go to `.6` and fall back to the bud on `SPRING.touch` (800ms total). When "Back to home" is hovered or focused, the bud blooms fully (`openPetals`, 0.8s), because the visitor is heading somewhere that did bloom; leaving the link closes it again. Reduced motion: static bud. Cost S, and it is the only 404 on the internet whose motion is its own logo.

### 2.6 The capsule over the ink section (P0, foundation)

The glass capsule is tuned for paper. Over the People section (the one ink ground) it becomes a frosted light slab on a dark page. Spec: one IntersectionObserver on `.surface-ink` with a root margin that limits it to the capsule's band (top 0 to 72px). While the band overlaps ink, `nav[data-tone="ink"]`: glass tint `rgba(10,18,32,.55)` with the `--line-on-ink` border, labels `--on-ink-2`, wordmark and mark mist, the lens mist with ink inverse labels, hover pill `rgba(220,237,245,.08)`, mark hover `#6F7CFF`. The cobalt pill stays as is (white on cobalt passes everywhere). All colour transitions 400ms house. Without this the one dark section looks like the nav forgot it existed.

### 2.7 Print (P1)

`beforeprint` calls `revealAll()` (exists in `reveal.ts`) and pauses every loop. Print CSS: hide nav, preloader, lemon, canvas, video, pause buttons and eggs; ink on white; external links print their URL after the text; the role page prints title, location, close label, description and the apply URL. Cost S. The egg E9 adds one line.

### 2.8 Image arrival (P1)

Every image sits on its manifest `placeholder` (24px blurred WebP data URI) as a CSS background; the real image fades in over 400ms house once `decode()` resolves. Combined with the wipe, nothing pops in late on a slow connection.

### 2.9 Countdown on the role page (P1)

"{d}d {h}h {m}m {s}s": seconds swap instantly every second (tabular figures, no animation: a digit rolling every second is a permanent loop above the fold). Minutes, hours and days roll with `odometer.to` when they change. No `aria-live`. Paused in hidden tabs, recomputed from the clock on return.

### 2.10 "Back to top" on the closing bloom (P2, needs copy)

Make the closing bloom a button (`aria-label` "Back to top", to be approved in COPY.md). Hover and focus: the 45 degree turn on `SPRING.touch`, as in the nav. Click: scroll to top (1.27) and the nav mark answers with its own turn when the page arrives. The bookend becomes useful. Only if Rahul approves the label.

### 2.11 "Apply" jump on the role page (P1)

Scroll to the form (1.27), then focus the first field with `preventScroll` once the scroll lands. No highlight: focus is enough.

### 2.12 Text selection (P0, exists: keep)

`::selection` in sun with ink text, on paper and on ink. Selecting text is using the group's highlighter. Keep as built.

### Rejected, with reasons

| Idea | Verdict |
|---|---|
| Custom cursor, cursor states over media | Cut. Generic, hurts accessibility, and the site already has a cursor companion: the lemon. One is the joke, two is a theme park |
| Magnetic buttons | Cut. BRIEF rule 2: CTAs never move on hover. A magnet is movement on hover |
| Number hover (re-roll a figure) | Cut. Numbers are not clickable (rule 3) |
| Global scroll progress bar | Cut. The nav lens is the progress indicator; a bar is template furniture |
| Tab title change when the visitor leaves | Cut. It nags in the tab bar and reads as a growth hack on a recruiting site. The return is handled with wit by E1 instead |
| Error shake | Cut (1.31) |
| Floating labels | Cut (1.30) |
| Section colour morph from paper to ink while scrolling | Cut. The ink section has a hard edge; morphing the whole page colour is a scroll-jacking cousin |
| Pinned or horizontal sections, scroll-snap galleries | Cut (rule 8) |
| Haptics (`navigator.vibrate`) on copy | Cut. Unreliable, iOS ignores it, Android buzz on a corporate site surprises |
| Shimmer skeletons | Cut (1.29) |
| Parallax on the rose or portraits | Cut. The bloom is the hero's motion |

---

## 3. Easter eggs

Nine eggs, four marked **TOP 4** for v1. Each is wit about the company, the craft, the fruit, the bird or the clock. None touches customers' bodies, sex, health worries or innuendo: the portfolio's products are intimate, so the eggs stay on the corporate side of the card (names, shapes, typography, numbers, the team's values). Reviewed against BRAND 3's test: would it still land if a candidate opened it in an open-plan office next to their manager? All nine pass.

Shared rules (built once in `src/lib/eggs.ts`, see section 5):
- Discovery by deliberate gesture only (0.6). Never on a pass-over hover of something not clickable.
- One egg animates at a time; an egg never blocks reading or a click (all egg layers `pointer-events: none` except their own trigger).
- Off under reduced motion, except E7 and E9, which do not move.
- Typed triggers ignore keystrokes while focus is in an input, textarea, select or contenteditable, and with any modifier key held.
- Found eggs are remembered per viewer in `localStorage` (`cb-eggs`, wrapped in try/catch): E7 reports the tally. Nothing else depends on it.
- Copy marked "copy to approve" goes to COPY.md through the copydeck owner before build; no egg ships copy the deck has not cleared.

### E1. While you were away (TOP 4)

- **Where:** the hero live counter.
- **Discovery:** easy and accidental. The visitor switches tabs or apps and comes back after at least 46 seconds, with the counter in view.
- **What happens:** the next tick is not "+1" but "+N", where N = `floor(secondsAway / 23)`, shown only for 2 ≤ N ≤ 99 (46 seconds to 38 minutes; outside that range the normal rhythm resumes silently). Same motion as the tick (1.8) with a longer hold: rise 1.6s becomes 2.6s. The ring pulses twice, 180ms apart. Then the 23s rhythm restarts from that moment.
- **Copy:** "+N" only, in the existing "+1" style. `aria-hidden`.
- **Dismissal:** automatic.
- **Why it fits:** "+1 ≈ every 23 s" is the most quoted line of the site, and this makes the rate felt, which BRIEF asks for. It is arithmetic on the published claim, never a new total.
- **Cost:** S. A `visibilitychange` timestamp and one branch in the ticker.
- **Owner check:** Rahul confirms at preview that showing the extrapolated "+N" is within the claim (it is the same rate, marked ≈ in the caption beside it).

### E2. Cycle time (TOP 4)

- **Where:** How we work, the lemon, while value 03 "Reduce cycle time" is active.
- **Discovery:** medium. Someone playing with the lemon while reading 03.
- **What happens:** the lemon times its own full turns (10 frames, which is 280px of travel). When a full turn takes under 0.6 seconds, the card counter "03 / 07" swaps through a `.swap` slot (500ms) to the visitor's time, "0.42 s", in the counter's own style, holds 1.8s, and swaps back. A later turn shows again only if it beats the visitor's best (kept in `localStorage`); a new best lands with the sun `.hl` band drawn under it, because evidence gets the highlighter.
- **Copy:** the number and "s" only, e.g. "0.42 s".
- **Dismissal:** automatic.
- **Why it fits:** the value says "move in tight loops"; the lemon is a loop of ten frames; the egg measures a loop and rewards making it shorter. It is the operating value as a toy.
- **Cost:** S to M (inside the lemon module, which already tracks distance).

### E3. Organic (re)org

- **Where:** the values list. See `values-lens.html`.
- **Discovery:** medium. Activate value 05 "Organic (re)org" while it is already active (click it again, or press Enter on it).
- **What happens:** the seven rows reshuffle into a random order (each row `translateY` to its new slot on `SPRING.touch`, 30ms apart), the lens follows 05 to its new place, the structure holds for 1.2 seconds, then the rows return to 01 to 07 in reverse stagger and the lens settles back. The card keeps showing 05's sentence: "rewrite it as soon as the structure stops serving the number". Transform only: DOM order and screen reader order never change.
- **Copy:** none.
- **Dismissal:** automatic, about 2.2s.
- **Why it fits:** the value describes a structure that rewrites itself around the problem and stops when it no longer serves the number. The list does exactly that.
- **Cost:** M.

### E4. Biird: the birds on the wire (TOP 4)

- **Where:** the Biird brand card. See `biird-ii.html`.
- **Discovery:** the first level is the card's hover moment (everyone sees it: section 4); the egg is the second level. Medium to hard: keep the pointer still on the card for 3 seconds.
- **What happens:** the two dots of the "ii" in "Biird" (the name is set with dotless i and two separate tittles placed from PP Mori metrics) take off in a soft arc, one after the other (140ms apart, a lower stiffness of 120 so they glide), and perch side by side on the card's top edge. Off the photo they turn ink. After 2.3 seconds one of them hops once. The name below reads "Bıırd" while they are away. Any pointer movement over 2px, or leaving the card, sends them home on `SPRING.touch`, 90ms apart.
- **Copy:** none.
- **Dismissal:** move the pointer.
- **Why it fits:** Biird names everything with a double i (Ohwii, Namii, Gii, Lumii) and its wordmark is lowercase dots and all. The brand's own letters are its birds. Pure typography, no illustration, no asset, nothing to misread.
- **Cost:** M.

### E5. Hello Nancy says hello back

- **Where:** the Hello Nancy brand card.
- **Discovery:** medium. Wave at the card: three horizontal direction reversals of the pointer within 900ms, each at least 24px.
- **What happens:** a reply rises from its own mask beside the name, in Newsreader italic 400 at the name's x-height, paper on the photo with the card's existing text shadow: rise 1.1s house, hold 1.6s, fade 300ms. The card's fruit window (section 4) rolls in at the same time and rocks once, which reads as a wave back.
- **Copy to approve:** "Hello yourself." (fallback: "Hello.").
- **Dismissal:** automatic.
- **Why it fits:** the brand's name is a greeting. The wit is about the name, not the product.
- **Cost:** S.

### E6. Four cities, one day

- **Where:** the cities line ("Hong Kong · Shenzhen · London · San Francisco") in the footer.
- **Discovery:** medium. Rest the pointer on the line for 800ms, or tap it on touch.
- **What happens:** each city name swaps through a vertical `.swap` slot (500ms, 60ms apart) to its local time, 24-hour, tabular: "21:14 · 21:14 · 14:14 · 06:14". Hong Kong and Shenzhen show the same time, which is true and a little funny. The times update on the minute while shown. Leaving (after 400ms) or tapping again swaps the names back. The real city names stay in the DOM; the times are an `aria-hidden` overlay.
- **Copy:** none (times are data: `Intl.DateTimeFormat` with `Asia/Hong_Kong`, `Asia/Shanghai`, `Europe/London`, `America/Los_Angeles`).
- **Dismissal:** leave or tap.
- **Why it fits:** a team that "moves within the day" across four cities; a candidate in London sees when San Francisco wakes up.
- **Cost:** S.

### E7. Under the hood (TOP 4, recruiting)

- **Where:** the browser console and the page source, every page.
- **Discovery:** hard, and only for the curious: exactly the people the careers page wants.
- **What happens:** on boot, one styled console message (PP Mori is unavailable there; use `font: 600 13px system-ui`, cobalt for the first line, ink-2 for the rest). An HTML comment at the top of each page's `<body>`.
- **Copy to approve:**
  - Console line 1: "Care & Bloom"
  - Line 2: "Curious is a good sign. {n} open roles: https://carenbloom.com/careers" (live count from `getRoleState()`; without a count: "Open roles: https://carenbloom.com/careers")
  - Line 3, only if the visitor has found at least one egg: "Eggs found: {k} of 9."
  - Line 4: "Try typing bloom." (the hint to E8)
  - HTML comment: "Curious is a good sign. Open roles: https://carenbloom.com/careers"
- **Dismissal:** none needed.
- **Why it fits:** it is recruiting copy placed where builders look, with a live number, which is the site's whole personality in one line.
- **Cost:** XS.

### E8. Type "bloom"

- **Where:** any page.
- **Discovery:** hard (hinted by E7).
- **What happens:** typing b, l, o, o, m (within 2 seconds) makes every mark on screen re-bloom: the nav mark turns 45 degrees and back on `SPRING.touch` while its petals close (300ms) and reopen with `openPetals` (0.8s, 75ms stagger); the closing bloom does the same if visible; on the 404 page the bud finally blooms. Throttled to once per 10 seconds.
- **Copy:** none.
- **Dismissal:** automatic.
- **Why it fits:** the bloom is the signature and the second half of the name; this is the only keyboard code on the site, and it is the brand's own word, not a borrowed Konami sequence.
- **Cost:** S (reuses `buildPetals` and `openPetals`).

### E9. The printed role

- **Where:** printing a role page (`/careers/apply/?role=…`).
- **Discovery:** hard, and only for candidates who print a job description, a real habit among senior people.
- **What happens:** the print stylesheet (2.7) adds one line at the foot of the last page, in 9pt ink.
- **Copy to approve:** "Printed for a closer read. Apply at carenbloom.com/careers/apply/?role={slug}"
- **Dismissal:** none.
- **Why it fits:** respects the reader who prints, and hands them the way back.
- **Cost:** XS.

Safety notes for builders: no fruit verbs (squeeze, peel, ripe) anywhere near Hello Nancy; no peach, cherry, banana or aubergine shapes ever; no "birds and the bees" in any Biird copy; the lemon is the team's mascot and is never linked to a product on this site.

---

## 4. Portfolio brands: a registry, not two one-offs

### 4.1 The idea

One data file, `src/data/brands.ts`, describes every brand. The brand cards, the spaces accordion status, the spaces petal indicator (1.17), the console egg and any future brand surface read from it. Each entry names a **moment** from a small library of four. Hello Nancy and Biird get their own moments; a third, fourth or tenth brand plugs in with one entry and its images, and gets a correct, on-brand default with zero new code.

### 4.2 The type

```ts
// src/data/brands.ts
export type BrandStatus = 'in-market' | 'coming-soon'
export type Space = 'sexual-health' | 'longevity' | 'mental-health' | 'education'

/** the hover/focus moment of a card; unknown or unmet requirements fall back to 'advance' */
export type Moment =
  | 'advance' // default: hovering shows the next gallery image with the house wipe
  | 'roll'    // the next image arrives in a motif-shaped window that rolls in (needs a motif per image)
  | 'hop'     // the tittles of the name's i and j hop (needs an i or j in the name)
  | 'none'    // coming soon, or a brand that wants stillness

export type MotifShape = 'lemon' | 'avocado' | 'raspberry' // grows in src/data/motifs.ts, one SVG path each

export interface BrandImage {
  key: string          // public/img/manifest.json images.<key>
  alt: string          // COPY.md
  motif?: MotifShape   // the silhouette that carries this image in a 'roll' moment
}

export interface BrandEntry {
  slug: string                 // 'hello-nancy'
  name: string                 // 'Hello Nancy', verbatim
  url: string | null           // null while coming soon: the card is then not a link
  linkLabel: string | null     // 'Visit Hello Nancy (opens in a new tab)'
  category: string             // label, verbatim: 'Sexual wellness'
  space: Space                 // drives the spaces accordion chips and petal indicator
  status: BrandStatus
  description: string          // verbatim
  gallery: BrandImage[]        // empty for coming soon
  ground: string               // hex sampled at build time from gallery[0]'s placeholder; '#DCEDF5' (mist) if no image
  moment: Moment
  egg?: 'wave' | 'perch'       // optional: E5, E4
  order: number                // in-market first, then by order
}
```

The two live entries:

```ts
export const BRANDS: BrandEntry[] = [
  {
    slug: 'hello-nancy', name: 'Hello Nancy', url: 'https://hellonancy.com',
    linkLabel: 'Visit Hello Nancy (opens in a new tab)', category: 'Sexual wellness',
    space: 'sexual-health', status: 'in-market',
    description: 'A stigmatized category, made easy to enter and safe to trust.',
    gallery: [
      { key: 'nancy-lem', alt: '…', motif: 'lemon' },
      { key: 'nancy-avocado', alt: '…', motif: 'avocado' },
      { key: 'nancy-raspberry', alt: '…', motif: 'raspberry' },
    ],
    ground: '', moment: 'roll', egg: 'wave', order: 1,
  },
  {
    slug: 'biird', name: 'Biird', url: 'https://biird.co',
    linkLabel: 'Visit Biird (opens in a new tab)', category: 'Intimate wellness',
    space: 'sexual-health', status: 'in-market',
    description: 'Design-led objects, made to be picked up, understood and bought without apology.',
    gallery: [{ key: 'biird-glass-sky', alt: '…' }, { key: 'biird-lilac-first-timer', alt: '…' }, { key: 'biird-ohwii-branch', alt: '…' }],
    ground: '', moment: 'hop', egg: 'perch', order: 2,
  },
]
```

(Alt text from COPY.md "Alt text" table; `ground` filled by the build script that already writes the manifest.)

### 4.3 Colour: what "accent" means here, and an open conflict

BRAND 12 says group UI never uses Hello Nancy pink `#FF30CC` or lime `#CCFD28`, and sub-brand colour "lives in their own photography inside brand cards". Mehdi's brief asks for each brand's accent to appear only inside its own card and only on interaction. These are compatible if the accent is taken from the photography: `ground` is sampled from the brand's own image, and every brand moment draws its colour from the photos themselves (the Hello Nancy fruit is a window onto the next photo, the Biird birds are paper or ink). `ground` is used only as the media slot's background while an image loads and as the coming-soon panel tint, inside the card. No brand hex is ever typed into group CSS. **Escalation:** if Mehdi wants the literal brand hex (pink, lime, Biird's teal) on interaction, that contradicts BRAND 12 and needs Rahul's decision; lime would also collide with sun.

### 4.4 The moments

All moments start on hover after 150ms intent and on keyboard focus of the card link, end on leave or blur, use `SPRING.touch`, and are off under reduced motion and on touch (touch gets the press dim of 2.2, and the gallery's normal cycle).

**`advance` (default, any brand with 2+ images).** The next image wipes up over the current one (clip-path `inset(100% 0 0 0)` to `inset(0)`, 900ms house; the incoming media settles from `scale(1.04)`), the progress segment jumps to it, and the cycle timer restarts. One hover advances once. It needs nothing but photos.

**`roll` (Hello Nancy).** Built in `nancy-roll.html`.
- The next image's motif (lemon, avocado or raspberry silhouette, an SVG mask, 30% of the card width) enters from beyond the right edge and rolls to rest at 62% across and 70% down. Position on `SPRING.touch`; rotation is `-(x - rest) / radius` radians, so it rolls without sliding and rocks slightly as the spring settles.
- The window shows the next photo, registered to the card: the photo inside counter-transforms (`scale(1/s) rotate(-θ) translate(-x, -y)` against the window's `translate(x, y) rotate(θ) scale(s)`), so it reads as a hole onto the next image, not a sticker. Colour comes only from Hello Nancy's own photography.
- Leave before 1.2s: it rolls back out to the right. Stay 1.2s: the window grows (`scale` to cover the card's diagonal, damping 30 so it does not overshoot) and the gallery advances under it.
- Missing a motif on an image: fall back to `advance`.
- Cost M. Desktop only (it is a hover moment). The mask scaling is a paint cost for 600ms on one card: verify at second pass on a mid-range laptop.

**`hop` (Biird).** Built in `biird-ii.html`.
- The name is rendered with dotless i (U+0131, present in both PP Mori weights) followed by a zero-size inline anchor holding a round dot of 0.158em placed at PP Mori SemiBold's tittle position (left `calc(-0.196em - letter-spacing)`, bottom 0.597em). Any i or j in any brand name works the same way, so the moment is generic typography.
- On hover, each dot gets an upward impulse (velocity equal to 58 times its own height per second, about 0.25em of travel) and falls back on `SPRING.touch`, the second 90ms after the first: two birds hopping on a wire.
- The name keeps its real text for assistive tech (the card link's label carries the name; the visual name is `aria-hidden` when split).
- A name with no i or j: fall back to `advance`.

**`none`.** No moment. Used by coming-soon entries automatically.

### 4.5 States

- **In market:** link card, gallery, moment, sun chip "In market" (drawn on reveal, 1.15), cursor media shift.
- **Coming soon:** not a link (no hover, no cursor change, no moment, rule 3), no gallery. The media slot is a mist panel (`ground`, which defaults to mist) with a 1px line border; it reveals like any card (`data-reveal="rise"`). Label, name, line chip "Coming soon", description. When a coming-soon brand gets photos and a URL, flipping its `status` and filling `gallery` turns it into a full card.
- **Spaces coupling:** a space shows "In market" in the accordion and an open petal in the indicator when at least one brand in that space is in market. Launching a longevity brand updates three places from one line of data.

### 4.6 Layout from 1 to 10 cards

Desktop (12 columns, gap 24px), in-market first:
- 1 card: full width, media 16:9.
- 2 cards: 6 + 6, media 4:5 (today).
- 3 or more: rows of 3 (4 + 4 + 4) and 2 (6 + 6), never a row of 1. Algorithm: fill rows of 3; if one card would be left over, make the last two rows 2 + 2. So 4 = 2 + 2, 5 = 3 + 2, 6 = 3 + 3, 7 = 3 + 2 + 2, 10 = 3 + 3 + 2 + 2.
- Name size: display-size h3 in 2-up rows, `--fs-h2` in 3-up rows.
- Gallery phase offset `index * interval / n` across all cards, and only cards at least 50% in view cycle, so six cards never flip together.

Mobile (< 768px): one column. In-market cards full width at 4:5. When the total passes 3, coming-soon brands render as compact rows (72px: name, category, line chip) under the cards, so the page does not become six phone-heights of placeholders.

### 4.7 Adding a brand

1. Drop its photos in `assets-src/`, run `scripts/images.mjs` (manifest and `ground` update).
2. Add one `BrandEntry`. Pick `moment: 'advance'` unless it has a motif set or wants `hop`.
3. Done: card, layout, chip, spaces status, petal indicator and console tally follow.

A new motif shape is one SVG path in `src/data/motifs.ts`, drawn to the brand's own product silhouettes and reviewed against the safety notes in section 3.

---

## 5. Implementation plan

P0 = v1 must, P1 = v1 should, P2 = later. "F" = needs a foundation change (route through the main session; section owners do not edit `src/lib`, `src/chrome`, `src/styles`).

### 5.1 Map

| # | Item | File(s) | Priority | F |
|---|---|---|---|---|
| 0.3 | Spring set (`touch`, `follow`, `lens`), delete `snappy` | `src/lib/motion.ts` | P0 | F |
| 0.3 | `--spring` regenerated from 320/26, `--dur-spring: 430ms`, `--dur-micro: 300ms` | `src/styles/tokens.css` | P0 | F |
| 0.5 / 1.5 | No blur under 768px or coarse pointer; `data-reveal="rise"`; stagger cap 6 | `src/styles/components.css`, `src/lib/reveal.ts` | P0 | F |
| 1.5 | Hold reveals during programmatic scroll; instant on restored scroll | `src/lib/reveal.ts`, `src/lib/lenis.ts` | P1 | F |
| 1.6 | `landed` class lifts mask clipping after the rise | `src/lib/split.ts`, `components.css` | P0 | F |
| 1.1 | Spy hysteresis 400ms, hash landing instant, lens travels on `pointerdown`, `contain` on tabs | `src/chrome/nav.ts`, `nav.css` | P0 | F |
| 1.2 | Mark turn on `SPRING.touch`, scroll to top on home | `src/chrome/nav.ts` | P0 | F |
| 1.3 | Pill count fold + odometer roll | `src/chrome/nav.ts`, `nav.html`, `src/lib/roles.ts` | P1 | F |
| 1.4 | Compact hysteresis (24px down, 48px up, focus and top-edge expand) | `src/chrome/nav.ts` | P0 | F |
| 2.6 | Capsule ink tone over `.surface-ink` | `src/chrome/nav.ts`, `nav.css` | P0 | F |
| 1.26 | Sheet close timing, burger on new spring | `src/chrome/nav.css` | P1 | F |
| 1.25 | Preloader skip on wheel/touchstart, house curve on curtain | `src/chrome/preloader.ts` | P1 | F |
| 1.27 | Anchor scroll expo easing, duration by distance | `src/lib/lenis.ts` | P1 | F |
| 1.8 | Live dot: no loop; `.live-dot.pulse` one-shot class | `src/styles/components.css` | P0 | F |
| 1.13 | Dot link touch `:active`, ring radius | `src/styles/components.css` | P0 | F |
| 1.14 | Button release spring | `src/styles/components.css` | P1 | F |
| 2.1 / 2.2 | Focus ring radii, tap highlight off, touch `:active` set | `src/styles/base.css`, `components.css` | P0 | F |
| 1.15 | Sun chip draws on reveal | `src/styles/components.css`, `src/lib/reveal.ts` | P1 | F |
| 1.23 | Copy strings per COPY.md | `src/lib/copy.ts`, `src/chrome/footer.html` | P0 | F |
| 1.22 | Footer count roll, swap captions, live dot pulse on data | `src/chrome/footer.ts`, `footer.html` | P1 | F |
| 2.3 | Route content fade (`html.pgt-fade`), no View Transitions | head snippet in `index.html`, `careers/index.html`, `careers/apply/index.html`; `src/styles/base.css` | P0 | F |
| 2.4 | Prefetch on intent + speculation rules | new `src/lib/prefetch.ts`, called from `src/pages/boot.ts` | P0 | F |
| 2.7 | Print: `beforeprint` revealAll, print CSS | `src/pages/boot.ts`, new `src/styles/print.css` | P1 | F |
| 2.8 | Placeholder ground + decode fade for images | `src/styles/components.css` (class), used by sections | P1 | F |
| eggs | Egg infrastructure (registry, guard, typed words, visibility, found tally) | new `src/lib/eggs.ts` | P0 for E1, E7 | F |
| 4 | Brand registry + motif paths | new `src/data/brands.ts`, `src/data/motifs.ts` | P0 | F (new shared files) |
| 1.17 / 2.5 / E8 | `budPetals(p, amount)` helper (petals to a given open amount) | `src/lib/bloom.ts` | P1 | F |
| 1.9 / 1.10 / 1.11 | Breathing ampersand, rose scrub (sequence + canvas + crossfade), hero entrance sequence | `src/sections/hero.ts`, `hero.html`, `hero.css` | P0 | |
| 1.8 / E1 | Live counter ticker, "+1" and "+N" | `src/sections/hero.ts`, `hero.css` | P0 | |
| 1.12 | Record odometers (three beats max) | `src/sections/record.html` | P0 | |
| 1.16 / 4 | Brand cards from the registry: stretched link, gallery cycle, progress, pause, media shift, layout algorithm | `src/sections/brands.ts`, `brands.html`, `brands.css` | P0 | |
| 4.4 | Moment `advance` | `src/sections/brands.ts` | P0 | |
| 4.4 / E4 | Moment `hop` + egg perch (Biird) | `src/sections/brands.ts`, `brands.css` | P0 hop, P1 perch (TOP 4: aim for v1) | |
| 4.4 / E5 | Moment `roll` (Hello Nancy) + egg wave | `src/sections/brands.ts`, `brands.css` | P1 roll, P2 wave | |
| 1.17 | Accordion (single-open, timings, keyboard) | `src/sections/spaces.ts`, `spaces.html`, `spaces.css` | P0 | |
| 1.17 | Spaces petal indicator from the registry | `src/sections/spaces.ts` | P1 | |
| 1.18 | People: stretched link, portrait develop | `src/sections/people.ts`, `people.css` | P0 | |
| 1.19 | Values tablist, lens, card swap, counter roll, mobile swipe | `src/sections/work.ts`, `work.html`, `work.css` | P0 | |
| 1.20 | Lemon follower | `src/sections/work.ts`, `work.css` | P0 | |
| E2 | Cycle time egg | `src/sections/work.ts` | P1 (TOP 4: aim for v1) | |
| E3 | (Re)org egg | `src/sections/work.ts` | P2 | |
| 1.21 | Player-coach pairs reveal, petal bullets | `src/sections/work.html`, `work.css` | P1 | |
| 1.28 / 1.29 | Careers rows, skeleton, petal loader, empty, error | `src/sections/careers.ts`, `careers.html`, `careers.css` | P0 | |
| 1.30 to 1.33, 2.9, 2.11 | Fields, toggles, tooltip, validation highlighter, upload, submit, success bloom, countdown, apply jump | `src/sections/apply.ts`, `apply.html`, `apply.css` | P0 (fields, validation, submit); P1 (success bloom, tooltip, countdown roll) | |
| 2.5 | 404 bud | 404 page (location to be set by the main session) | P1 | F |
| E6 | Four cities | `src/chrome/footer.ts` | P2 | F |
| E7 | Console note + HTML comments | `src/lib/eggs.ts`, the three page HTML files | P0 (TOP 4) | F |
| E8 | Type "bloom" | `src/lib/eggs.ts` + `src/lib/bloom.ts` | P2 | F |
| E9 | Print line | `src/styles/print.css`, `src/sections/apply.ts` (slug) | P2 | F |
| 2.10 | Closing bloom as "Back to top" | `src/chrome/footer.*` | P2, needs copy | F |

### 5.2 Foundation changes, in one list for the main session

1. `motion.ts`: spring set `touch 320/26`, `follow 170/22`, `lens` pair; remove `snappy`.
2. `tokens.css`: new `--spring` linear() (0.3), `--dur-spring`, `--dur-micro`.
3. `components.css`: blur only on fine pointers 768px and up; `data-reveal="rise"`; live dot one-shot `.pulse` instead of the infinite ring; dot link touch `:active`; button release spring; sun chip draw; focus ring radii; image placeholder/decode class; `.line-mask` overflow visible under `.landed`.
4. `base.css`: `-webkit-tap-highlight-color: transparent`; `html.pgt-fade` content fade; print stylesheet import.
5. `reveal.ts`: stagger cap at 6; hold during programmatic scroll; instant on restored scroll; trigger chip draw.
6. `split.ts`: add `landed` on complete.
7. `nav.ts` / `nav.css`: spy hysteresis and `data-spy` on spaces (section owner adds the attribute), hash landing, lens on `pointerdown`, mark spring and scroll-to-top, compact hysteresis, ink tone, pill count fold, sheet close timing, burger spring.
8. `preloader.ts`: skip on wheel and touchstart; curtain on the house curve.
9. `lenis.ts`: expo easing, distance-based duration, a `isProgrammatic()` flag for reveals and compact.
10. `copy.ts` and `footer.html`: COPY.md strings.
11. `footer.ts`: count roll, swap captions, live dot pulse, (P2) cities egg, (P2) back to top.
12. `bloom.ts`: `budPetals()`.
13. New files: `src/lib/prefetch.ts`, `src/lib/eggs.ts`, `src/data/brands.ts`, `src/data/motifs.ts`, `src/styles/print.css`; head snippet for the route fade in the three page HTML files; HTML comments (E7).

### 5.3 Second-pass checklist (what I will test on the built site)

- Spring feel on a 120Hz Mac: nav mark, lens, values lens, card moments, press release.
- 6x CPU throttle at 390px: hero scrub, reveals (no blur), accordion, careers list arrival. No frame over 16.7ms during scroll.
- Keyboard only: every moment reachable and visible (1.16, 1.18, 1.19, 2.1), no focus traps outside the sheet.
- VoiceOver: no announcement from the counter, galleries pausable, accordion and tablist semantics.
- Reduced motion: walk the matrix in 0.7.
- Touch (Playwright at 390px plus a real phone): press states, no hover leftovers, lemon idle, swipe on values.
- Eggs: each one found by its gesture, none triggered by a pass-over hover, none moving under reduced motion.
