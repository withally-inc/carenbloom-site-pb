# Slow-mobile homepage performance

## Profile

Both cold runs used Chrome DevTools AXI against the same local server and worktree revision boundary.
The viewport was 390×844 at device scale factor 3 with touch and mobile emulation.
Network throttling was `Slow 3G` and CPU throttling was 4×.
The supplied live-site scout remains the external reference at FCP 11.88s, DOMContentLoaded 14.09s, and load 39.37s; this report uses the controlled local before/after pair because the task forbids deployment.

## Before and after

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| First contentful paint | 8.388s | 6.188s | −26.2% |
| DOMContentLoaded | 15.248s | 8.688s | −43.0% |
| Load event | 40.159s | 17.957s | −55.3% |
| Settled transferred bytes | 1,569,720 | 746,388 | −52.5% |

The after column was re-measured on the same profile after `critical.css` was extended to the whole stylesheet.
A same-session control run of the earlier above-fold-only `critical.css` reproduced FCP 5.008s, DOMContentLoaded 9.079s, load 17.531s and 724,199 bytes against its recorded 4.784s / 8.967s / 17.266s / 727,312 bytes, so the before column is measured on a comparable profile and the FCP cost of the extension is real rather than drift.

## First-paint diagnosis

The reveal gate was not holding back first contentful paint.
Before the change, the 49,347-byte render-blocking `style.css` response ended at 8.207s and FCP followed at 8.388s.
After the change, the blocking path is `tokens.css` plus the 32,315-byte `critical.css`; the latter ended at 6.041s and FCP followed at 6.188s.
`critical.css` is the minified whole of `style.css`, so the blocking sheet already carries every section: nothing below the fold can paint unstyled and the deferred sheet's activation reflows nothing.
That completeness costs 1.4s of the earlier first-paint win and buys the correct, fully styled page for a reader who scrolls before the deferred sheet lands.
Every path takes `style.css` with non-matching `media="print"`: because the blocking `critical.css` is already the whole stylesheet, scroll restoration, deep anchors and history re-parses all calculate against final geometry without it, so no navigation pays for a second blocking copy.

## Waterfall

| Request or event | Before end | After end | Effect |
| --- | ---: | ---: | --- |
| HTML response | 2.988s | 3.041s | Same document cost |
| `tokens.css` | 4.338s | 4.573s | Still blocking and small |
| `critical.css` | — | 6.041s, 32,315B | Blocking owner of the whole page |
| `style.css` | 8.207s | 12.551s | Deferred from first paint |
| FCP | 8.388s | 6.188s | Follows the blocking CSS in both runs |
| `app.js` | 7.606s | 8.652s | Module dependencies now preload in parallel |
| Last module / DOMContentLoaded | 15.248s | 8.688s | Serial module discovery removed |
| Hero start still | 29.179s, 326,318B PNG | 8.367s, 69,068B AVIF | Same 896×1200 art |
| Hero end still | 40.158s, 747,563B PNG | 16.692s, 147,880B AVIF | Same 896×1200 art |
| Hero video | Requested at 15.276s, aborted at 34.189s | Not requested | Mobile static crossfade |
| Last font / load event | 21.137s / 40.159s | 17.952s / 17.957s | Fonts do not block FCP |

## Every navigation path, same profile

`style.css` is deferred on every path, so no navigation pays for a second blocking copy of rules `critical.css` already carries.
All four paths measured at 390×844×3, `Slow 3G`, 4× CPU.

| Path | Navigation type | FCP | DOMContentLoaded | Load | Bytes | Restored offset |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Fresh top-level visit | `navigate` | 6.124s | 8.765s | 17.853s | 746,069 | 0 (top) |
| `/#contact` | `navigate` | 6.360s | 8.645s | 17.878s | 746,069 | 15,051 (contact) |
| Reload parked at the footer | `reload` | 6.260s | 8.709s | 17.907s | 746,069 | 15,051 (footer) |
| Back after leaving to `/careers/apply/` | `back_forward` | 0.224s | 0.385s | 0.399s | 0 (cache) | 15,062 (footer) |

Every cold path lands in the same 6.1–6.4s band, and each restored path lands on the offset it left from, so the blocking sheet alone already carries final geometry.
The back/forward row was forced to re-parse rather than restore from bfcache (an `unload` listener registered before leaving); with bfcache available the same navigation restores instantly to the same 15,062 offset without re-fetching anything.
On all four the `style.css` link is `media="print"` with its `onload` handoff, never render-blocking.

## Remaining deferral tradeoff

`critical.css` and `style.css` now carry the same rules, so a fresh visit transfers the 49,349-byte `style.css` a second time after first paint — the +19,076 bytes and +0.4s load-event difference against the control run above.
It is kept because it is the readable source of record and lands last, so a future edit to `style.css` alone cannot ship a stale minified copy: the deferred sheet corrects it. It is never render-blocking on any path, so it costs no first paint anywhere.
The generated `critical.css` must be regenerated whenever `style.css` changes, and `tests/repository-contract.test.mjs` fails if the two ever carry different rules. `tests/footer-wordmark.test.mjs` pins the sign-off's typography, scale and below-fold layout against `critical.css` alone, and asserts on the reload, `/#contact` and back/forward paths that the source-of-record sheet stays off the render path.

## Footer correctness route

The sign-off is flat, static and always visible: there is no arming, no observer, no prepared or hidden state and no motion, so no stylesheet arrival order can hide it and no scroll can catch it mid-transition.
Its typography, oversize scale, bottom crop and ink stroke live in the stylesheet, which is complete in the blocking `critical.css`.
A gradual scroll-down, a restored-scroll reload, `/#contact`, a history back navigation, reduced motion and disabled JavaScript all render the same finished sign-off; `tests/footer-wordmark.test.mjs` samples every one of those paths and fails on any opacity, transform, transition or animation.

## Visual-quality evidence

The full-resolution AVIFs were encoded at quality 75 for the hero and simpler product stills, and quality 85 for the noisier lifestyle/portrait assets.
Full-resolution SSIM against decoded source pixels ranges from 0.954 to 0.997.
Rendered 390px comparisons show no visible composition, color, text, edge, or product-detail regression at the actual mobile display size.

- `before-hero-png.png` and `after-hero-avif.png` compare the hero end frame.
- `before-nancy-raspberry-png.png` and `after-nancy-raspberry-avif.png` compare the product carousel image.

The original PNGs remain as `<picture>` fallbacks.
The 448px and 540px AVIF variants are selected for lower-density narrow viewports while high-density phones retain the full-resolution AVIFs.
