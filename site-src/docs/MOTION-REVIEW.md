# Care & Bloom v4: motion review (second pass)

21 October 2026. The built site challenged against `docs/MOTION-CHALLENGE.md` section 5.3, on `pnpm build` served by `vite preview` on port 4186. The nav is judged as built (the petal compass of `docs/nav-sketches/DECISION.md`), with the same severity as the rest.

## Method

Every check was scripted with Playwright against the real build (scripts kept locally in `qa/motion/`, which is git-ignored):
- Visual tour at 1440 and 390: intro frames, every section, nav states (top, band, seal, ink tone, hover), mobile menu.
- 6x CPU throttle at 390x844, DPR 2, scrolling the whole home page while recording every frame interval and long task.
- Keyboard only: Tab walk on home (desktop and mobile), careers and apply, recording the focused element, its visibility and its focus indicator; focused-state captures of the stretched-link cards, person blocks and form fields.
- Accessibility tree (`ariaSnapshot`) of home, careers and apply.
- Reduced motion (`reducedMotion: 'reduce'`) at both widths: preloader, infinite animations, pixel diff of each screen after it settles, eggs, hidden reveals.
- Touch (390, `hasTouch`): hit testing of the mark, menu open and quarter navigation, values swipe, lemon idle.
- Every egg by its gesture (E1 to E8).
- Lighthouse 13.5 mobile on home, three runs.

## Scores

| Area | Score | One line |
|---|---|---|
| Nav (petal compass) | 8.5 / 10 | The most ownable piece of the site; shipped with a P0 that made the mobile menu unreachable by touch (fixed) |
| Hero | 8.5 / 10 | Strong entrance and breath; flash of the final figure, LCP and scrub jank fixed |
| Record | 8.5 / 10 | Calm, exact; odometer window tightened |
| Brands | 9 / 10 | Registry, roll and hop moments, pause, phase offset, two eggs: as specified |
| Spaces | 8.5 / 10 | Single-open accordion and petal indicator are right |
| People | 9 / 10 | The develop and the ink tone make the one dark section feel designed |
| How we work | 8.5 / 10 | Lens, swap, lemon and (re)org are right; E2 fired by accident (fixed) |
| Footer | 8.5 / 10 | Closing bloom, count, copy, Back to top all behave |
| Careers | 9 / 10 | Row-scale dot link, skeleton with petal loader, states |
| Apply | 8.5 / 10 | The highlighter validation is the best form moment on the site |
| 404 | 8 / 10 | The bud that blooms on "Back to home" works; the bud is small |
| Eggs | 9 / 10 | All eight verified by gesture; E9 not built (copy pending) |

## Fixed in this pass (P0 and P1)

1. **Nav, P0: the mobile menu could not be opened by touch.** Below 960px the menu button sits over the mark, but it came first in the DOM with no stacking order, so the home link's mark painted above it and took every tap: on home a tap scrolled to the top, elsewhere it navigated home. `elementFromPoint` at the button's centre returned the mark's SVG. The button now has `z-index: 2` (`src/chrome/nav.css`). Verified: menu opens on tap, focus lands on the current quarter, a quarter tap closes the panel, scrolls to its section and focuses it.
2. **Hero, P0: the record figure flashed its final value before rolling.** The hero's hidden state is released by `is-played` at the start of the entrance, but the odometer only plays 0.6s later, so "1,000,000+" sat on screen for about 0.4 to 0.6s, vanished and rolled back in. The figure is now held at opacity 0 until its odometer plays (`src/sections/hero.ts`).
3. **Hero, P1: LCP (the open item in `docs/QA.md`).** Decision: the hero paints under the curtain. On a first visit the head script adds `cb-curtain`; the rose is no longer clipped, it is painted under the opaque bloom curtain from the first frame, and when the curtain dissolves (0.9s into the intro, `curtain-open`) it settles from 1.08 to 1 over 1.4s. The petals, the flight into the nav and the type rising on landing are untouched, and the curtain revealing the flower reads as part of the bloom. Repeat visits keep the wipe. Render delay of the LCP element: 2.8s to 35 to 61ms. Lighthouse home mobile: 91 to **94** (three runs), LCP 3.3s to **2.9 to 3.0s** (the remainder is Lantern counting fonts and the boot chunk fetched before first paint; see `docs/QA.md`).
4. **Hero, P1: scrub jank on a throttled phone.** The canvas backing store was the displayed size times DPR, so each frame resampled two 538x720 frames on the main thread with high-quality smoothing: 22 to 29 frames over 33ms (up to 67ms) and a 62 to 69ms long task, all inside the first 434px of scroll. The store is now the frames' own size, so each draw is a 1:1 blit and the compositor scales it. Result at 6x CPU: p95 frame 9.4ms, **zero frames over 33ms, no long task** over the whole page.
5. **Odometer, P1: reel fragments above the digits.** The window was 1.1em for 0.72em digits, so a rolling reel showed bits of the neighbouring digits floating above the cap line. The window is now 0.92em (`--odo-h`), digits stay inside it with 0.1em to spare, and at rest nothing of the reel shows (`src/styles/components.css`). Applies to every odometer (hero, record, counts, values counter).
6. **How we work, P1: E2 fired by accident.** It timed 280px of horizontal travel, which any quick mouse move across the section produces, including the move to the "03" tab itself. It now fires on a loop drawn with the cursor (the pointer's heading turns a full 360 degrees one way; under 0.9s shows the time). A straight sweep never fires it; a loop does. That is also closer to the value: "move in tight loops".

## Verified and kept

- **Springs:** one set in `src/lib/motion.ts` (`touch 320/26`, `follow 170/22`, `lens` pair), the CSS `--spring` generated from 320/26, no stray spring values in the sections, no `elastic` or `bounce`. Durations in CSS stay on the ladder (200ms only for field focus, as specified).
- **Keyboard:** every stop has a visible indicator. Stretched links draw their ring on the photo (brands) or around the block (people, `#6F7CFF` on ink); fields use the 3px cobalt ring. Values tablist, accordion, menu trap and Escape all work.
- **Screen readers:** banner, primary nav, main, contentinfo; one h1; the counter is a labelled group with no live region; the gallery, accordion (buttons inside headings, `aria-expanded`, labelled regions), tablist and tabpanel are exposed correctly; portraits and logos have alt text.
- **Reduced motion:** no preloader, no infinite animation, every screen pixel-identical once settled, every reveal visible, E8 ignored.
- **Touch:** values swipe advances one value, the lemon idles at its stop-motion rhythm, press states exist for dot links, rows, cards and buttons.
- **Nav judged as built:** the compass is right. The lit petal walks N, E, S, W with the reading, the mark is whole at the top, the line folds to two seals while reading and returns on 48px up, the ink tone switches over People, and the mobile quarters repeat the reading state. The hysteresis and hash-landing rules from 1.1 survived the redesign.

## Eggs, by gesture

| Egg | Gesture | Result |
|---|---|---|
| E1 While you were away | Tab hidden for 125s, then back with the counter in view | "≈ +5" rose from the dot (N = floor(125 / 23)); the build adds "≈", more honest than the spec's bare "+N" |
| E2 Cycle time | Value 03 open, a loop drawn with the cursor | "0.86 s" in the counter, new best stored; straight sweeps do nothing |
| E3 Organic (re)org | Activate 05 twice | Five rows displaced, lens followed, all back to 0 after 2.3s |
| E4 Biird perch | Pointer still on the Biird card for 3s | Dots perched on the top edge in ink, flew home on movement |
| E5 Hello Nancy | Wave (5 horizontal reversals) over the card | "Hello yourself." at full opacity, fruit rolled in |
| E6 Four cities | Pointer resting on the footer cities 800ms | Times shown, Hong Kong and Shenzhen identical |
| E7 Under the hood | Load any page | Console note with the live count and the "bloom" hint |
| E8 Type "bloom" | Typed outside a field | Marks re-bloomed, egg recorded |

## Remaining P2

- **E9 printed role:** not built. Its line ("Printed for a closer read. Apply at carenbloom.com/careers/apply?role={slug}") is not in COPY.md yet.
- **Petal bullets at 11px** (nav current item, player-coach lists) read as small rounded squares. Try 0.6em or the petal rotated so its tip points at the label.
- **404 bud** reads as four small squares at its size; set it larger (32 to 40px) so the bud is legible before it blooms.
- **Boot chunk:** 68 KB gzipped is the last lever on simulated LCP. Lazy-loading the egg code and the GSAP plugins used below the fold would cut it.
- **Odometer passage values:** the hero figure passes through values like "0,777,567" for a few frames while landing on 1,000,000+. It is the specified "last 3 to 5 steps" motion; if Rahul finds a figure under a million on screen uncomfortable, start the leading digit on 1 and roll only the zeros.

## For Rahul to decide

1. E1 shows "≈ +N" (customers implied while the visitor was away), computed from the published "+1 ≈ every 23 s". Confirm it stays within the claim.
2. E9's print line, if wanted, needs approved copy.

## Verification

- `pnpm build`: clean (tsc and vite).
- `BASE=http://localhost:4186 node scripts/smoke.mjs`: ALL PASS (home, careers, apply, 404 at 1440x900 and 390x844).
- Lighthouse 13.5 mobile, home: 94 / 100 / 100 / 100, LCP 2.9 to 3.0s, CLS 0, TBT 0 to 30ms (three runs).

---

# Pass 3 (before the redeploy)

21 October 2026, same build-and-preview method, every check run in **both themes** (light and violet) at 1440 and 390: section tour, 6x CPU at 390, keyboard walk, accessibility tree, reduced motion with a pixel diff of every settled screen, touch, every egg by its gesture, smoke and Lighthouse. New since pass 2: the record (dot field, 36 month cells, nine slots), the live tip, hero clocks and the 49-frame scrub, the places map, brand-card companions, spaces icons, the player-coach pod and Coach / Player switch, values hand art, Build with us, violet mode.

## Scores, pass 3

| Area | Pass 2 | Pass 3 | One line |
|---|---|---|---|
| Nav (petal compass, theme switch) | 8.5 | 9 | The sealed mark now steps into the margin instead of sitting on the labels; the theme flood from the mark is the best switch I have seen on a group site |
| Hero | 8.5 | 8.5 | Clocks and the 49-frame bloom are right; frames were re-decoded mid-scroll (fixed) |
| Record | 8.5 | 8.5 | Three facts at three scales reads as a record, not a chart; the dot fill cost 25 to 40ms frames (fixed); its live tip was a focus stop on an invisible dot (fixed) |
| Brands | 9 | 9 | Companions keep off the product; moments and eggs intact in both themes |
| Spaces | 8.5 | 8.5 | The icons make the list a set; Education read as a "J" (redrawn as an open petal book) |
| People and places | 9 | 8.5 | The map is a strong close to the ink section; it bled to the screen edge on phones and showed every city label over its pin (both fixed) |
| How we work | 8.5 | 8.5 | The pod diagram and switch are clear; values art sits well in the card |
| Build with us | (new) | 8.5 | The highlighter validation carries over in both themes; tiles now carry the spaces icons |
| Footer | 8.5 | 9 | The closing bloom stays open once opened, so it is there at rest and in captures |
| Careers | 9 | 9 | Row names now contain what is seen (label in name) |
| Apply | 8.5 | 8.5 | Unchanged, verified in violet |
| 404 | 8 | 8 | Unchanged |
| Violet mode | (new) | 8.5 | A true register of the brand; sun read olive in the halftone art (fixed at the generator) |
| Eggs | 9 | 9 | E1 to E8 verified by gesture in both themes |

## Fixed in pass 3

1. **Spaces, Education icon:** redrawn in the family (petal geometry, stroke 2 in the 42 box): an open book, two petals as pages with their 90 degree tips meeting at the foot of the spine and two lines of text on each. Checked at 30px with the other three in both themes (`src/sections/spaces.icons.ts`).
2. **Build with us tiles:** the generic petal replaced by the four spaces icons, and the mark for "Something else"; choosing a tile redraws its icon path by path (the spaces draw-in) or blooms the mark (`src/sections/build.*`).
3. **Violet halftone, sun:** two bugs in `scripts/halftone-dark.mjs`. The colour mask was blurred on a one-channel buffer that sharp returned as three channels and then read as one, so the mask came from the wrong part of the image and sun pixels were re-inked by the neutral rule (sun at 70% alpha over violet, which is olive). The mask is now read on one channel, and in sun zones each pixel is the ink it is mostly made of, opaque: pure #FDFF6D dots on the violet ground, cobalt as the violet-blue, shadows and paper as the ground. `pnpm images` rerun twice: byte-identical (218 files hashed), and only the violet hero stills and bloom frames changed.
4. **Footer closing bloom:** once fully open it latches open (the scrub is released and the mark finishes on the house curve), so it shows at rest, after a scroll back up, in full-page captures, and at once when the page loads at its foot. Reduced motion keeps the static whole mark.
5. **Nav while reading:** desktop, the sealed mark slides into the margin on the touch spring with its disc sized to the gutter (32 to 44px), measured clear of the content column at 1024 to 1920. Below 960px the reading state keeps the whole line on its band (mark, wordmark, count), since there is no margin to step into.
6. **Places:** the phone map sits on the page gutter (verified 320 to 1920, city row included), and only the lit city is labelled on a phone, as specified (the desktop dimming rule out-ranked the phone rule).
7. **Performance at 6x CPU, 390:** the record dot field now paints only the dots in flight each frame; bloom frames are kept as ImageBitmaps (an `<img>` outside the document lost its decoded pixels and drawImage decoded it again mid-scroll); odometer reels lost their permanent `will-change` (151 composited layers to 58). Home p95 frame 25ms to **17.4ms** (light) and 17.6ms (violet), frames over 33ms 15 to 4 to 9 depending on the run, no image decode on the main thread during the scrub.
8. **Accessibility:** the record's live-tip button was in the tab order while its dot was still at scale 0 (now hidden until the dot exists); home links named "Care & Bloom home" so the name contains the visible wordmark (WCAG 2.5.3); role rows keep their visible text as their name and read the API apply label after it; the player-coach heading reads as two sentences.
9. **Smoke:** `THEME=violet node scripts/smoke.mjs` runs every page in violet mode and checks the theme. ALL PASS in both themes.

## Remaining P2 (pass 3)

- The count seal on the right can still pass over right-aligned content while reading (chips, accordion plus signs). It is wide, so it cannot step into the margin; a smaller count-only seal would.
- The Education icon is wider and shorter than the other three (a book is), so it reads slightly lighter at 30px.
- Hero and record still cost 17 to 25ms frames at 6x CPU (compositor commit and layerize while the dot field and the scrub run); the page has no long tasks during scroll.
- Palette quantization leaves the violet sun at 253,255,110 with alpha 254 instead of 253,255,109 opaque; invisible, noted for exactness.
- From pass 2: E9 (print line, copy pending), petal bullets at 11px, the 404 bud size, the boot chunk size.

## For Rahul to decide (pass 3)

1. The live tip says "≈ {n} new customers today" (counted from midnight in Hong Kong) and "≈ {n} since you arrived", both from the published "+1 ≈ every 23 s". Like E1, confirm it stays within the claim; it is the most explicit extrapolation on the site.
2. The new microcopy listed in `docs/COPY.md` ("Microcopy added after the first deck") and Build with us (6b).

## Verification (pass 3)

- `pnpm build`: clean.
- `BASE=http://localhost:4186 node scripts/smoke.mjs` and `THEME=violet ...`: ALL PASS (four pages, two widths, each theme).
- Lighthouse 13.5 mobile: home 92 / 100 / 100 / 100 in both themes, careers and apply 98 / 100 / 100 / 100 in both themes (`docs/QA.md`).
