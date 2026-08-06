# Slow-mobile homepage performance

## Profile

Both cold runs used Chrome DevTools AXI against the same local server and worktree revision boundary.
The viewport was 390×844 at device scale factor 3 with touch and mobile emulation.
Network throttling was `Slow 3G` and CPU throttling was 4×.
The supplied live-site scout remains the external reference at FCP 11.88s, DOMContentLoaded 14.09s, and load 39.37s; this report uses the controlled local before/after pair because the task forbids deployment.

## Before and after

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| First contentful paint | 8.388s | 4.784s | −43.0% |
| DOMContentLoaded | 15.248s | 8.967s | −41.2% |
| Load event | 40.159s | 17.266s | −57.0% |
| Settled transferred bytes | 1,569,720 | 727,312 | −53.7% |

## First-paint diagnosis

The reveal gate was not holding back first contentful paint.
Before the change, the 49,347-byte render-blocking `style.css` response ended at 8.207s and FCP followed at 8.388s.
After the change, the blocking path is `tokens.css` plus the 9,826-byte `critical.css`; the latter ended at 4.664s and FCP followed at 4.784s.
The full stylesheet now downloads with non-matching `media="print"` and activates on load, so it no longer blocks the first paint.
Reloads, restored-scroll navigations, and hash navigations keep the full stylesheet blocking so the browser calculates final document geometry before restoring the viewport.

## Waterfall

| Request or event | Before end | After end | Effect |
| --- | ---: | ---: | --- |
| HTML response | 2.988s | 3.045s | Same document cost |
| `tokens.css` | 4.338s | 4.335s | Still blocking and small |
| `critical.css` | — | 4.664s | New above-fold blocking owner |
| `style.css` | 8.207s | 11.146s | Deferred from first paint |
| FCP | 8.388s | 4.784s | Follows the blocking CSS in both runs |
| `app.js` | 7.606s | 8.956s | Module dependencies now preload in parallel |
| Last module / DOMContentLoaded | 15.248s | 8.967s | Serial module discovery removed |
| Hero start still | 29.179s, 326,318B PNG | 7.275s, 68,768B AVIF | Same 896×1200 art |
| Hero end still | 40.158s, 747,563B PNG | 16.212s, 147,580B AVIF | Same 896×1200 art |
| Hero video | Requested at 15.276s, aborted at 34.189s | Not requested | Mobile static crossfade |
| Last font / load event | 21.137s / 40.159s | 17.264s / 17.266s | Fonts do not block FCP |

## Footer correctness route

The small prepared, visible, transition, and reduced-motion rule set for `.footer-wordmark-text` is inline in the document head.
The deferred bundle no longer owns those states, so the arming script cannot hide the wordmark before its state styles exist.
The script also verifies the prepared computed style and immediately falls back to visible static text if the expected hidden transform is unavailable; a second timeout releases any stranded prepared state.

Fresh top-level visits retain the deferred full stylesheet and its FCP gain.
Reloads, restored-scroll visits, and `/#contact` use a parser-inserted blocking full stylesheet because browser testing showed that deferral allowed scroll restoration against incomplete document geometry.
This hybrid route preserves the optimization where safe while favoring the footer's visibility and arrival contract everywhere else.

## Visual-quality evidence

The full-resolution AVIFs were encoded at quality 75 for the hero and simpler product stills, and quality 85 for the noisier lifestyle/portrait assets.
Full-resolution SSIM against decoded source pixels ranges from 0.954 to 0.997.
Rendered 390px comparisons show no visible composition, color, text, edge, or product-detail regression at the actual mobile display size.

- `before-hero-png.png` and `after-hero-avif.png` compare the hero end frame.
- `before-nancy-raspberry-png.png` and `after-nancy-raspberry-avif.png` compare the product carousel image.

The original PNGs remain as `<picture>` fallbacks.
The 448px and 540px AVIF variants are selected for lower-density narrow viewports while high-density phones retain the full-resolution AVIFs.
