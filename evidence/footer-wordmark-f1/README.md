# Footer sign-off evidence — live wordmark (f1)

`reference-mobbin-section.png` is the captain's Mobbin reference (the Parker footer sign-off).
Every `after-*.png` is the shipped Care & Bloom footer at that viewport, `during-1440x900.png` is the arrival mid-transition, and `reduced-motion-*` / `no-js-*` are the two fallback resting states.

## Honest divergences from the reference

The reference supplied one property only: an oversized, single-line, bottom-cropped wordmark closing the page.
Everything below is a deliberate divergence, taken because the site's own type system and motion character outrank the reference's surface.

- **Typography.** The reference is a red brand-specific serif script with its own bespoke letterforms. Ours is uppercase Syne 600, the landing page's existing display token, at `-0.055em` tracking. The wordmark inherits the site type system rather than importing a face, so no new font ships and the brand reads as the same voice as the rest of the page.
- **Motion.** The reference loops continuously as a marquee. Ours is a one-shot scroll-triggered arrival in the homepage's unhurried transform-and-opacity character, and it never animates again. Perpetual motion in a page footer is a distraction and an accessibility cost we are not willing to pay.
- **Crop and alignment.** The reference crops a left-anchored word against the page edge. Ours is centered and cropped from below by `.footer-wordmark-clip` (`height: 0.82em`), because "Care & Bloom" is two words plus an ampersand and reads as off-balance when left-anchored under a centered contact block.
- **Stroke.** The reference uses a heavy white outer stroke against black for a sticker-like edge. Ours uses a restrained `1–2px` ink stroke with `paint-order: stroke fill` on cobalt — enough to hold the letterforms against the dark footer without introducing a sticker material the rest of the site does not use.
- **Scale.** The size is `max(38px, 12.1vw)` with no upper cap, so the sign-off keeps filling the footer edge-to-edge above 1440px (verified at 1920px and 2560px in `tests/footer-wordmark.test.mjs`). An earlier `174px` cap left dead margin on wide desktops and was removed.

## Related deliberate change

The `max-width: 479px` contact heading was reduced from `clamp(32px, 8.8vw, 44px)` to `clamp(28px, 8.8vw, 34px)`.
This is intentional and retained: at 320px the old size broke "conversation." onto a second line directly above the new full-width wordmark, stacking two competing oversized type blocks. The smaller heading restores the footer's hierarchy — contact heading, then sign-off — and the single-line result is pinned by the 320px assertion in `tests/footer-wordmark.test.mjs`.
