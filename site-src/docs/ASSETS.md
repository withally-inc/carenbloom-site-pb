# Assets (v4)

Rebuild everything: `python3 -I scripts/brand/outline.py 36 && node scripts/brand/brand.mjs && pnpm images && node scripts/brand/og.mjs`.

**`pnpm images`** (`scripts/pipeline.mjs`) regenerates `public/img/` in dependency order and is idempotent (a rerun on unchanged sources leaves every file byte-identical):

1. `scripts/images.mjs`: base images, logos, lemon, bloom sequence and manifest.
2. `scripts/visit-images.mjs`: visitor guide photos.
3. `scripts/values/build.mjs`: values art and its violet prints, when its source directory exists.
4. `python3 -I scripts/companions/build.py`: companion sprites and their violet prints, when the generator exists.
5. `scripts/halftone-dark.mjs`: violet variants of the base images, last because the base generator deletes them.

`pnpm images -- --extras` passes `--extras` to the base generator; `pnpm images -- --seq` rebuilds only the bloom sequence and its violet frames.
`pnpm images:base` runs the base generator alone.
`scripts/images.mjs` wipes and regenerates what it makes in `public/img/` from `assets-src/` (it keeps `values/`, `companions/` and `visit/`, which separate generators own).
`--extras` also writes the files no page requests (bloom videos and posters, PNG sprite copies, the Casetify raster): they ship with the next build if left in place, so run it only when you need them.
Never edit `public/img/` by hand.
Each manifest image carries `ground` (sharp `stats().dominant`).

## Manifest: `public/img/manifest.json`
- `images.<name>`: `width`, `height` (intrinsic, of the largest file), `aspect`, `widths` (available, never upscaled, so the top width can be 640, 800, 896 or 1080), `formats` (`["avif","webp"]` or `["webp"]`), `alpha`, `pattern` (`/img/<name>-{w}.{format}`), `src` (largest WebP), `placeholder` (24px blurred WebP data URI, on paper), `alt` (suggestion, COPY.md wins), `bytes`.
- `bloom.sequence`, `bloom.poster`, `bloom.video`, `lemon`, `logos`: described below.
- Write `srcset` from `widths` x `formats`; always set `width`/`height` from the manifest.

## Hero (the bloom)
- Stills `hero-start-{480,896}.webp`, `hero-end-{480,896}.webp`: rose cut out of the old mist ground (exact colour-to-alpha, no halo), transparent, 896x1200 frame shared with the video. WebP only: palette lossless keeps the halftone dots pixel-exact and is 3x lighter than AVIF here. `fetchpriority="high"` on `hero-start`.
- Video on paper `#F4F6F8` (H.264 high + VP9, faststart, no audio, 24 fps, 97 frames, 4.04 s): `hero-bloom-720.{mp4,webm}` (538x720, ~270 KB), `hero-bloom-1080.{mp4,webm}` (806x1080, ~460 KB). `hero-bloom.mp4/.webm` = the 720 files. Tagged bt709; decodes to paper exactly (Chromium) or +1 level (Chrome).
- Scrub variants `hero-bloom-{720,1080}-scrub.mp4`: keyframe every 2 frames, no B-frames (~850 KB / 1.4 MB). For `currentTime` scrubbing in Chrome/Firefox.
- Sequence `bloom-seq/bloom-00.webp` to `bloom-48.webp`: 49 frames (every second frame of the 97-frame source, `manifest.bloom.sequence.sourceFrames`), 538x720, transparent, max 38 KB, total ~1.2 MB. Violet frames `bloom-seq/bloom-violet-00.webp` to `bloom-violet-48.webp`, ~1.1 MB. Scrub fallback for Safari (draw to canvas or swap `src`). Lighter than the scrub video, so it is a fine default everywhere.
- Poster (first frame on paper): `hero-bloom-poster-{720,1080}.{webp,avif}`. Use the WebP (smaller than the AVIF for this halftone).
- Alpha files are exact on light grounds (paper, white, mist). Do not place them on ink: cobalt darkens and dots get a grey fringe.

## Brands
`nancy-avocado`, `nancy-lem`, `nancy-raspberry`, `biird-glass-sky`, `biird-lilac-first-timer`, `biird-ohwii-branch`: square, AVIF q58 + WebP q80. Widths 480/960/1080 (raspberry and lilac stop at 800). Raspberry's transparent corners are filled with its own pink.

## People
`portrait-{rahul,momoko}-cobalt-{480,640}.{avif,webp}`: one duotone map (cobalt `#2331E4` to paper `#F4F6F8`), same percentile stretch, face median 0.5, same S-curve, square 640. Eye midpoints at 54.4% / 43.6% of the square in both; faces at the same scale (within 6%).
`portrait-*-ink-*`: ink `#0A1220` to mist `#DCEDF5`. It reads like a print on the ink People section.
Use: ink version at rest in the dark People section, cobalt version on hover/focus (the duotone "deepens" into cobalt), crossfade the two stacked images. On paper, use cobalt only.

## Lemon
`lemon-sprite.webp` / `lemon-sprite.png` = 10 frames of 360x360 in one row (3600x360), transparent, ~31 KB / 38 KB.
`lemon-sprite-180.{webp,png}` = 10 frames of 180x180 (1800x180). Frame N: `background-position-x: calc(-N * frame)`; use the 360 sprite on 2x screens for a 180px lemon.

## Proof logos
`logos/im8.svg`, `logos/peak21.svg`, `logos/casetify.svg`: single colour ink, viewBoxes optically padded so the three read the same at one CSS height (e.g. `height: 32px`). Aspects: IM8 3.34, Peak21 3.64, Casetify 2.40 (exact values in manifest). Casetify is a potrace trace of the PNG (block in ink, letters and dot knocked out); raster fallback `logos/casetify@2x.{png,webp}` (160px tall). Brief styling: ink at 60% opacity. Alt: IM8, Peak21, CASETiFY.

## Brand files (`public/brand/`)
- `logo-horizontal-{ink,paper,cobalt}.svg`: icon + wordmark C, aspect 7.54. Icon height = cap height x 1.45, centred on the cap height, gap = 0.45 x icon width.
- `logo-wordmark-{ink,paper,cobalt}.svg`, `logo-mark-{ink,paper,cobalt}.svg`, `logo-mark.png` (512, ink, transparent), `logo-mark-paper.png` (512, paper).
- Wordmark outlined from PP Mori SemiBold + Newsreader italic 400 (opsz 36) "&" at 1.08em, tracking -0.02em, GPOS kerning. Glyph positions match Chrome's live-text rendering to the unit. On the site the wordmark stays live text (BRIEF 2.2); these files are for OG, favicons, press.

## Favicons and meta
`favicon.svg` (ink, mist under `prefers-color-scheme: dark`), `favicon-32.png`, `apple-touch-icon.png` (180, mist mark on ink), `icon-192.png` / `icon-512.png` (ink on paper, inside the maskable safe zone), `site.webmanifest` (theme and background `#F4F6F8`).
`og.png` 1200x630 from `scripts/brand/og.html` (lockup, the hero line with "enormous" in Newsreader italic, the cut-out rose, cities).

## Values art (`public/img/values/`)
One hand per value for the "Our operating values" card, the hero motif's family: ink hand, cobalt object, sun highlights, transparent. 01 rocket, 02 key, 03 stopwatch, 04 pencil in a sharpener, 05 rooted cutting, 06 seedling, 07 scissors cutting paper.
- Files: `value-0N.webp` (about 1200 px long side), `value-0N-600.webp` (re-screened at 600, never downsampled), `value-0N-violet[-600].webp` (light-on-dark print for violet mode: lavender hand, `#9A98FF` object, dotted sun, same frame as the plain file). Lossless WebP, 30 to 60 KB at 1200.
- `manifest.json`: per value `src`, `srcset`, `srcViolet`, `srcsetViolet`, `width`, `height`, `scale` (image height as a share of the card height, read by `work.art.ts`), `edge` (card edge the wrist is cut by), `enters` (position along that edge), `anchor` (image point, 0..1, on that edge), `visible` (share of the image inside the card along the entry axis: the whole object and the fingers), `sun` (area fraction).
- Dots are locked to the rose as drawn: at 1440 the hero's 1200 px frame is 723 CSS px tall, so its 6 px cell is 3.6 CSS px. The card is 460 px tall and draws a hand at `scale` × 460, so each file's cell is 3.6 / (scale × 460) of its height (about 16.8 px in a 1200 px tall file). Change `scale` in `scripts/values/build.mjs`, never in the manifest alone, or the dots drift.
- Tone: the hand is clipped to solid ink in the shadows and opens to paper in the lights (quantiles 0.04 / 0.97, S-curve, mean coverage 0.56); the object is cobalt dots opening to paper on its lit side (mean 0.60); parts thinner than a cell (stems, roots) print solid like the rose's stem; sun zones are placed per object (rocket nose and fin, key bow and bit, stopwatch crown and rim, pencil shaving and tip, three leaf tips, seed and first leaves, paper curl and handle).
- Pipeline: Gemini photographs (`gemini-3-pro-image`, prompts in `scripts/values/prompts.json`, generator `scripts/values/generate.mjs`), a hand holding an object painted solid blue on white so it separates by hue; kept picks in `scripts/values/sources/`. `scripts/halftone.mjs` is the general treatment (options at the top of the file, BRAND-PROPOSALS item 10). Rebuild: `node scripts/values/build.mjs`. Contact sheet and a 1:1 crop against the hero hand: `node scripts/values/contact.mjs` (writes `.builds/values-contact.png` and `-crop.png`).
- For full rebuilds and cleanup ownership, see the image pipeline above.

## Violet mode (`-violet` variants)
- **Naming.** The violet file sits next to the light one, `-violet` inserted before the size or frame number, or before the extension: `hero-start-896.webp` → `hero-start-violet-896.webp`, `bloom-seq/bloom-07.webp` → `bloom-seq/bloom-violet-07.webp`, `logos/im8.svg` → `logos/im8-violet.svg`. A manifest pattern `/img/<name>-{w}.{format}` becomes `/img/<name>-violet-{w}.{format}`. In code, `themedSrc(url)` / `themedSrcset(srcset)` from `src/lib/theme.ts` apply the rule for the current theme. Companions (`bird-violet-120.webp`), the lemon (`lemon-sprite-violet-180.webp`) and the values art (`value-0N-violet-600.webp`) follow the same rule.
- **Generator.** `node scripts/halftone-dark.mjs` (all), `--seq` (bloom frames only) or `node scripts/halftone-dark.mjs img/x.webp …` (some).
  For its place in a full rebuild, see the image pipeline above; run alone only after changing one light halftone.
  The values art makes its own violet prints (`scripts/values/build.mjs`); this script is for files that only exist as light halftones.
- **Halftone art** (hero stills, the 49-frame bloom sequence, the poster when `--extras` made it, lemon sprites, any ink + cobalt + sun halftone): each pixel is read over the old mist ground it was cut from, unmixed into ink, cobalt or sun, and highlight, then re-inked. Neutral art (the hand, the lemon): ink dots → lavender-mist dots #D9D2F5, highlights → transparent. Colour art (the flower), chosen by a blurred chroma mask: cobalt → #5F5BFF, sun → sun, highlights → lavender #DCD5F5, ink shadows → a deep shade of their colour. Alpha files are exact on the violet ground #160F2E and raised #201838; opaque sources (posters) are flattened onto #160F2E. Output is re-quantized to 48 colours and saved as lossless WebP like the light files (within a few KB of the originals; the sequence totals about 1.1 MB against 1.3 MB).
- **Portraits** `portrait-*-ink-violet-*`: night #050310 to lavender #DCD5F5, the print for violet People at rest. `portrait-*-cobalt-violet-*`: violet-blue #5F5BFF to lavender, the hover print. AVIF q58 and WebP q80, same widths.
- **Proof logos** `logos/*-violet.svg`: the single ink fill becomes lavender mist #EDE9FC. No raster Casetify violet: the SVG covers it.
- **Not made:** the bloom videos (violet mode scrubs the sequence), product photos (full colour in both themes, BRAND 10), the favicon (already mist under `prefers-color-scheme: dark`).
- **Loading.** Only the active theme's files load. HTML images: two siblings `.theme-only-light` / `.theme-only-violet`, both `loading="lazy"`; the hidden one is `display:none` and never fetched until its theme is on. CSS backgrounds: a `[data-theme="violet"]` rule (only the matching rule's image loads). JS-driven assets: `themedSrc()` at init and on `theme:change` (`onTheme()`), cached after the first switch. An eager LCP image needs a preload of the active theme from the head script (`docs/VIOLET-SWEEP.md`, hero).


## Visitor guide photography

`node scripts/visit-images.mjs` rebuilds `public/img/visit/hong-kong/` from cropped JPEG masters in `assets-src/visit/hong-kong/`.
Run it inside `site-src/`; the masters are build sources and are not served.
It emits 384×288 and up to 768×576 WebP variants (the smaller Negroni original stops at 600×450), with no network calls or upscaling.
For full rebuilds and cleanup ownership, see the image pipeline above.
Run `npm run build:site` from the repository root afterwards to publish the assets through the normal site build.
Photos stay in natural colour in both themes.
See [the visitor source record](VISIT-HONG-KONG-SOURCES.md#photography-and-reuse-rights-8-november-2026) for licences, credits and substitutions.
