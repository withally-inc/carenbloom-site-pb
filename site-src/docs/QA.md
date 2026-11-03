# QA (integration, 2026-10-21)

Build: `pnpm build` clean (tsc and vite). Smoke: `pnpm preview` on 4174, `node scripts/smoke.mjs` ALL PASS on home, careers, apply and 404 at 1440x900 and 390x844 (overflow now checked strictly: any scrollWidth beyond clientWidth fails). Full-page captures in `qa/`.

## Lighthouse 13.5, mobile (simulated throttling), against `vite preview`

Pass 3 of the motion review (2026-10-21, port 4186), after the record field, live tip, places map, companions, Build with us and violet mode landed. The theme was forced per run with `--blink-settings=preferredColorScheme=1` (light) or `=0` (violet: with no stored choice, a dark system preference means violet), confirmed on each report's final screenshot.

| Page | Theme | Performance | Accessibility | Best Practices | SEO | CLS | LCP | TBT |
|---|---|---|---|---|---|---|---|---|
| Home `/` | light | 92 | 100 | 100 | 100 | 0.000 | 3.2 s | 60 ms |
| Home `/` | violet | 92 | 100 | 100 | 100 | 0.000 | 3.1 s | 70 ms |
| Careers `/careers` | light | 98 | 100 | 100 | 100 | 0.000 | 2.3 s | 0 ms |
| Careers `/careers` | violet | 98 | 100 | 100 | 100 | 0.000 | 2.3 s | 0 ms |
| Apply `/careers/apply?role=chief-of-staff` | light | 98 | 100 | 100 | 100 | 0.000 | 2.3 s | 0 ms |
| Apply `/careers/apply?role=chief-of-staff` | violet | 98 | 100 | 100 | 100 | 0.000 | 2.3 s | 0 ms |

Home observed LCP is the first paint (61 to 80 ms, render delay about 42 ms): the curtain fix from pass 2 holds. The simulated 3.1 to 3.2 s (pass 2: 3.0 s) is Lantern counting the boot chunk, now larger with the new sections, and the fonts fetched before that first paint. The experimental "label in name" audit flagged the home links ("Care and Bloom home" against the visible "Care & Bloom") and the role rows (the API apply label replacing the visible text); both are fixed (`Care & Bloom home`; the apply label is read after the visible row text).

Earlier, pass 2: home 94, 94, 94 (LCP 2.9 to 3.0 s). Integration: home 91 (LCP 3.3 s), careers and apply 98.

SEO is 100 here because `vite preview` does not send the `X-Robots-Tag: noindex, nofollow` header that `vercel.json` sets on purpose; on the Vercel preview, "Page is blocked from indexing" will fail and SEO drops accordingly until the header goes at domain cutover. The 404 keeps its own `noindex` meta.

## Below target or worth a look

- **Home LCP: decided and fixed in the motion review (`docs/MOTION-REVIEW.md`).** The rose was clipped until the bloom intro landed (2.8 s of render delay). Now, on a first visit, the rose is painted under the opaque curtain from the first frame and the curtain dissolving is its entrance (it settles from 1.08 as the curtain opens); the bloom, the flight to the nav and the hero type rising on landing are unchanged. Repeat visits (no curtain) keep the wipe. Observed LCP is now the first paint (80 ms, render delay 35 to 61 ms). The simulated 3.0 s that remains is Lantern's pessimistic graph counting everything fetched before that first paint (three fonts, 68 KB gzipped of boot JS, CSS) on simulated Slow 4G; the next lever would be a smaller boot chunk, not the choreography.
- **Unused JS on first load: 27 KB of 68 KB** in the boot chunk (GSAP plugins and egg code paths that run later). Not worth splitting into extra requests at these sizes.

## Other checks run

- Marks at rest: every petal transform is exact about the centre (bud translate 12.2 = 21 x 0.58; 404 bud rotated about the centre), the footer bloom is unrotated and whole once open, no mark rotated by a stylesheet.
- Apply nav clearance, 320 to 1920: after the Apply jump the form title lands at 104 to 120 px and the preview banner at 104 to 236 px, under a nav whose lowest painted pixel is at 54 to 58 px.
- Coherence at 1440 and 390: identical section padding (85.6 px / 52 px), every label and headline on one left edge, every h1 to h3 balanced, one card radius (24 px), one ink section, sun at most 1.4 % of any screen at rest, PP Mori and Newsreader only, no em or en dash in `dist/` or `src/`.
- Accessibility: one exposed h1 per page and per apply state, banner, nav, main and contentinfo, skip link to `#main`, alt on every image, mobile focus order skip link, mark (menu), wordmark, count; the open menu traps focus and Escape returns it to the button. Muted on mist 4.58:1.
- Reduced motion (Playwright `reducedMotion: 'reduce'`, all pages, both widths): no preloader, no infinite animation, nothing moves while idle, every reveal visible.
- Interactions: E5 reply rises and clears; hovering a portrait or a brand photo gives its link the dot gesture, hovering the pause button does not; Back to top shows its label, turns 45 degrees, scrolls to 0, focuses `#main`; the careers statement is hidden on /careers and apply; role links have no trailing slash and `/careers/apply/?role=x` 308s to `/careers/apply?role=x`.
