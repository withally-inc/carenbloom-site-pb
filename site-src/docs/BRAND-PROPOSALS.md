# Care & Bloom brand proposals

Refinements to the approved v4 system in `docs/BRIEF.md`. None of them touches the four final decisions (Direction A, wordmark C, one wink word per headline, v1 scope). Contrast values are WCAG 2.1 ratios computed from the hex values.

## Safe now

These can land during the build without breaking a layout or an approved look.

### 1. Darken Muted from #66717F to #5F6A78
Muted on mist measures 4.13:1, below AA for 14px captions, and mist is where cards and their captions live. #5F6A78 gives 5.08:1 on paper, 5.50:1 on white, 4.58:1 on mist and 5.16:1 on sun: AA on every light surface. The shift is too small to see side by side.
`--muted: #5F6A78;`

### 2. Correct the Ink 2 claim, keep the value
BRIEF says Ink 2 on paper is above 12:1. It measures 11.50:1 on paper and 12.46:1 on white. Both are AAA, so the color stays and the sentence changes to "AAA on every light surface (11.5:1 on paper)". Darkening to #262F41 (12.38:1) would buy nothing a reader can see.

### 3. Make the on-ink values tokens
They exist in BRIEF as prose. As tokens, nobody reaches for cobalt on ink (2.35:1, fails) or Muted on ink (3.78:1, fails).
```
--on-ink:        #DCEDF5;               /* 15.60:1 */
--on-ink-2:      #9FB3C2;               /*  8.66:1 */
--cobalt-on-ink: #6F7CFF;               /*  5.36:1, marks and focus ring */
--line-on-ink:   rgba(220,237,245,.14);
```

### 4. One highlighter geometry for sun
"Sun as a word underline" needs a single drawing so every page highlights the same way: a band under the lower half of the x-height, slightly inset, drawn left to right with the house curve.
```css
.hl{background:linear-gradient(#FDFF6D,#FDFF6D) no-repeat 0 88%/0% .42em;
    transition:background-size 1.1s cubic-bezier(.16,1,.3,1);padding:0 .06em;margin:0 -.06em}
.hl.is-in{background-size:100% .42em}
```
Never on a wink word (it would double the emphasis), at most one per screen.

### 5. Wink word metrics
Newsreader's italic overhangs to the right and its x-height is smaller than Mori's. At 1.08em the wink reads small at display sizes and clips in line masks. Proposed: 1.08em up to h2, 1.12em at display and h1, `letter-spacing: -0.01em`, `padding-inline-end: .08em` inside the mask, `margin-inline-end: -.04em` to keep the word spacing even.

### 6. Display tracking that tightens with size
-0.03em is right at 64px and loose at 208px, where PP Mori's sidebearings open up. Scale it: `letter-spacing: clamp(-0.04em, calc(-0.024em - 0.08vw), -0.03em)`. At 1440px wide that gives about -0.035em on the hero.

### 7. Reversed logo in mist, not paper (applied)
Applied on 21 October 2026: `public/brand/logo-*-mist.svg` now exist. Keep `-paper` for photography only.

The outlined masters named `-paper` are #F4F6F8. The approved wordmark board and BRIEF set the reversed logo in mist #DCEDF5, the text color of the ink section. On ink, paper is a cold white next to mist body text. Add `-mist` versions (or recolor `-paper`) and use them on ink, keep paper for photography.

### 8. Normalize spelling to American (applied in COPY.md)
One word on the site is British: "stigmatised" in the Hello Nancy line. Everything else is American (behavior, prioritized, judgment). Change it to "stigmatized". BRAND.md section 4 explains the choice.

## Later

Bigger moves. Each needs a decision from Rahul and Momoko.

### 9. A drawn ampersand
The ampersand is the one ornament of the logo and it is a stock Newsreader glyph. Commission a custom italic "&" drawn to PP Mori's stroke weight at 600 (thicker hairlines than Newsreader's, terminals cut at Mori's angle) and use it in the logo, the breathing hero and the endorsement line. Budget: a one-glyph job for a type designer, outlined into the masters.

### 10. A reproducible halftone pipeline
v3's duotones were made by hand and differ from one image to the next. Write `scripts/halftone.mjs` (sharp): grayscale, levels 8 to 96%, 45° round-dot screen at a 6px cell for 1440px output, map shadows to #0A1220, midtones to #2331E4, highlights to #F4F6F8, optional sun mask for one highlight. Every future portrait and hero then shares one treatment.

### 11. The petal as a component set
Section 9 of BRAND.md defines petal bullets, the loader and the pattern. Build them once (an SVG sprite with the single petal path cut from the mark, a 1.2s loader, a pattern tile at 4P) so decks, careers and future brand sites stop improvising spinners and bullets.

### 12. Dark register from Direction C, as tokens
Dark mode was left out of v1. When it comes back, keep it a register of the same palette: ground #0A1220, raised #121A25, text #DCEDF5, secondary #9FB3C2, cobalt #6F7CFF, sun unchanged (17.59:1 on ink), line rgba(220,237,245,.12). The halftone portraits invert their highlight ink from paper to #121A25. No new hue.
