# Care & Bloom website v4 — build brief

Design brief for the v4 redesign.
The [root README](../../README.md) owns current runtime routes, API boundaries, build commands, and review deployment policy.
Owner: Melriver (Mehdi Izemmour). Client: Care & Bloom, a Hong Kong consumer health group (Rahul Ramchand, Momoko Kashiwabara).
Approved direction page: https://claude.ai/artifact/4jsjVKQCbcA2t7LRmcaAe3 (decisions below are final).

## 1. The job

Rebuild carenbloom.com so it reads like a nine-figure group: elegant, sexy, unmistakably crafted, and still funny.
Same content and brand DNA as the live v3, a far higher bar on typography, readability, restraint and micro-interactions.
The bar is melriver.com (`/Users/mehdiizemmour/claude/melriver/website`) and joinroster.co (`/Users/mehdiizemmour/claude/personal/roster-redesign`). Study their motion code before writing yours.

Audience: candidates (15 open roles), partners and investors, press. The page's job: make a strong operator want to join, and make a partner believe the record.

## 2. Final decisions

1. **Direction A, "the group, calm and sharp".** Cool off-white paper, ONE dark section per page, mist as secondary surface, acid yellow only as a highlighter.
2. **Wordmark C.** The four-petal icon unchanged + "Care & Bloom" in PP Mori SemiBold, sentence case, the ampersand in Newsreader italic 400 at 1.08em. On the web the wordmark is live text next to the inline SVG icon (crisp, themeable). Outlined SVG files exist for OG/favicons only.
3. **One wink word per headline, never two**, set in Newsreader italic (`.wink`). Not every headline needs one. Hero: "enormous".
4. **Scope v1:** Home + /careers + /careers/apply, deployed as a Vercel preview for Rahul. Domain cutover later.

## 3. Brand tokens (do not invent others)

```
--paper   #F4F6F8   page ground, cool off-white
--paper-2 #FFFFFF   raised cards on paper
--mist    #DCEDF5   secondary surface (cards, one band max)
--ink     #0A1220   headlines; the one dark section's ground
--ink-2   #2B3447   body text on paper (contrast > 12:1)
--muted   #66717F   captions, labels
--line    rgba(10,18,32,.10)
--cobalt  #2331E4   what is live: links dot, counter, active state, focus ring, duotone portraits
--sun     #FDFF6D   highlighter ONLY: a word underline, a status chip, a live dot ground. Max ~5% of any screen. Never a full band. Always carries ink text, never light text.
On ink: text #DCEDF5 (mist), secondary #9FB3C2, cobalt brightened to #6F7CFF for marks.
```
Dark mode is out of scope for v1 (the single ink section covers the "night" register).

## 4. Typography

- Display / headings: **PP Mori SemiBold 600**, tracking -0.03em at display sizes, -0.02em at h2, line-height 0.95 to 1.05, `text-wrap: balance`. Files in `public/fonts/` (woff2 + otf). Self-host, `font-display: swap`, preload the two woff2, write metric-matched fallback @font-face (Helvetica Neue / Arial with size-adjust) to avoid layout shift.
- Wink + quotes: **Newsreader** italic (Google Fonts family "Newsreader", opsz 6..72, weights 300..500). Self-host it: download the latin italic woff2 into `public/fonts/` (do not hotlink Google). Quotes in italic 300.
- Body: PP Mori Regular 400, **18px / 1.6**, color ink-2, max 62ch. Lede 21-24px / 1.45 ink.
- Labels / eyebrows: PP Mori 600, 12px, uppercase, tracking .12em, muted. **No monospace anywhere** (Azeret Mono is retired).
- Numbers: `font-variant-numeric: tabular-nums` on every counter/odometer.
- Type scale (clamp): display `clamp(64px, 13vw, 208px)`, h1 `clamp(44px, 7vw, 104px)`, h2 `clamp(34px, 4.6vw, 64px)`, h3 `clamp(22px, 2vw, 28px)`, body 18, small 15, caption 14, label 12.

## 5. Motion system (the heart of this build)

Libraries: GSAP 3 (+ ScrollTrigger + SplitText, all free now), Lenis smooth scroll driven by the GSAP ticker. Same wiring as `melriver/website/src/main.ts`. Reuse/port `melriver/website/src/lib/{fx.ts,spring.ts,glass.ts,marquee.ts}` and the nav lens logic in `nav.ts` rather than reinventing.

Rules (non-negotiable):
1. One house curve: `expo.out` (CSS `cubic-bezier(.16,1,.3,1)`), entrances ~1.1s. One spring for what people touch.
2. CTAs never move on hover: colour change only, press scale .97.
3. Text links: a cobalt dot appears on the left and pushes the label, underline draws in from the left (see direction page demo). No hover effect on anything not clickable.
4. Reveals: rise 16px + blur 6px→0, opacity 0→1, stagger 60-80ms. Images: wipe up from the bottom (clip-path) with inner scale 1.08→1.
5. Headlines: masked line rise (SplitText lines + mask), 1.1s, 75-90ms stagger, slight 2.5deg rotate from bottom-left.
6. Numbers roll like an odometer: left digits land first, each digit rolls only its last 3-5 steps. Port `odometer()` from melriver `lib/fx.ts`.
7. Marquees slow, ease to a stop on hover (melriver `marquee.ts`), never hard-freeze.
8. No forced scroll, no pinned horizontal sections, no scroll-jacking. Pinning is allowed only for a short, natural sticky (e.g. a sticky label column).
9. Hover effects only under `(hover:hover) and (pointer:fine)`. `prefers-reduced-motion`: opacity only, the ambient loops stop.
10. Nothing clipped: descenders, italic overhangs (pad the line masks), big numbers.
11. **Content is visible at rest.** Reveal from a visible state or guarantee a fallback: if JS fails or the observer never fires, nothing stays at opacity 0 (add `html.js` class gating; without it everything is shown).
12. Animate transform/opacity/clip-path only. No layout thrash, no blur filters on large areas during scroll.

Signature moments (only these get the spotlight):
- **The bloom.** The four-petal icon is the preloader (first visit per session only, < 1.6s, skippable): petals open from the centre, the mark flies into the nav capsule (melriver intro pattern). On hover in the nav it turns 45deg and goes cobalt. It closes the page in the footer, opening as it scrolls into view.
- **The breathing ampersand.** In the hero, the italic "&" of Care & Bloom (or the wink word) breathes very slowly (5s, scale 1→1.06, ±2deg). The only permanent loop above the fold.
- **The live counter.** The current site states "1,000,000 customers" and "+1 ≈ every 23 s" (static text). Keep both claims exactly and make the rate felt, not a fake total: "1,000,000+" stays fixed as an odometer; beside it a cobalt live dot pulses, and every 23 seconds a small "+1" rises from the dot and fades. Never display a total above what the site claims.
- **The lemon.** One halftone lemon (sprite `assets-src/lemon-rotation-sprite.png`, 10 frames × 360px) lives in the "How we work" section, follows the cursor with inertia and rotates through its frames as it moves; it rests when the cursor leaves. On touch it idles with a slow rotation. This is the joke; keep it to one lemon.
- **The glass nav.** A compact liquid-glass capsule centred at the top (port melriver `.glass` + `liquidGlass()`), brand icon + wordmark, links Brands · People · Careers, and a cobalt "Open roles (15)" pill with the live count from the API. Compacts while reading down, returns on scroll up. Active-section lens like melriver's tabs.

## 6. Information architecture

### Home (`/`), six movements + footer
1. **Manifesto (hero).** Huge display "Care & Bloom" with the breathing italic ampersand. Under it the line "We move fast. We experiment. We build *enormous* brands." Then the live counter, and the four cities "Hong Kong · Shenzhen · London · San Francisco". The blue halftone rose in a hand (`assets-src/hero-grow-start.png` / `hero-grow-end.png` / `hero-grow.mp4`: the rose blooms) is the single image: the bloom plays as the visitor scrolls the first 40vh (scrubbed video frame or crossfade start→end), not on load. No tilted stat cards, no visible grid lines.
2. **The record.** One line of three odometers: Customers 1,000,000+ · Revenue 9 figures · Under 36 months, with a one-line kicker "In under 36 months, profitably." Proof line below: "Leaders who grew" + IM8 · Peak21 · Casetify logos (assets-src svg/png), monochrome ink at 60%.
3. **Brands.** Hello Nancy and Biird as two large photo cards (images in assets-src: nancy-*, biird-*). Each card cycles its 3 images slowly (crossfade 5s) with a thin progress bar, name in h2, category label, "In market" sun chip, one-line description (verbatim), "Visit brand ↗" dot link to hellonancy.com / biird.co. Cursor-aware media shift max 8px. Intro sentence above: "Our portfolio starts where trust is hardest to earn…" (verbatim).
4. **The spaces.** Four verticals as an accordion list (grid-rows animation): Sexual health (In market, open by default), Longevity, Mental health, Education (Coming soon). Copy verbatim. Intro: "We focus on health categories where people need more than content or commerce…"
5. **People (the ONE ink section).** Intro sentence verbatim. Rahul Ramchand and Momoko Kashiwabara: cobalt duotone portraits (assets-src/leader-*.png; re-tone if needed), name, one-line bio verbatim, LinkedIn dot link. Portrait reveal: wipe + duotone that deepens on hover.
6. **How we work.** Merge "Our operating values" (7) and "Focused teams. Player coaches." into one object: left a list of the 7 values (number, name), right a single large card showing the active value's name + sentence; click/hover/arrow keys change it with a smooth content crossfade + the lemon reacting. Below: the player-coach model as two columns (Pilot and co-pilot teams / Player coaches) and the "What player-coach means" two-list (Coach: what you own / Player: what you do not delegate). Verbatim copy.
7. **Footer.** Two big statements: "Join the *spaceship*." with "15 open roles" live + link to /careers, and "Start a conversation." with hello@carenbloom.com (confirmed, decoded from the current site) shown as text + copy button. Wordmark, cities, © 2026 Care & Bloom Limited, the closing bloom.

### Careers (`/careers`)
Hero: "Join the *spaceship*." + one paragraph from the current careers page. Live list from `GET /api/role-state` (JSON: `openRoleCount`, `groupCounts`, `roles[] {slug,title,locationType,careerGroup,careerOrder,state{isOpen,visibleCloseLabel,...}}`), grouped Platform / Launch / Scale / Source & Build with counts, each row: title, location, close label, arrow → `/careers/apply/?role=<slug>`. Skeleton state while loading, graceful error state with a retry. Copy for the page comes from `docs/reference-current-site/careers.html` and the `careers/` folder.

### Apply (`/careers/apply/?role=slug`)
Rebuild the existing form in the new design (fields listed in `docs/reference-current-site/careers/apply/index.html`, logic in `docs/reference-current-site/scripts/careers-apply.js`: read it, mirror its payload exactly). **Submission guard:** real POST to `/api/applications` ONLY when `location.hostname` is `carenbloom.com` or `www.carenbloom.com`. On any other host show a clear inline notice "Preview: applications are not sent from this address." and do not send. Never point the form at another host.

### API integration
See the [root README](../../README.md#canonical-role-data-and-lifecycle) for deployed API ownership and CORS, and [local development guidance](../../README.md#changing-the-site) for the Vite proxy.

## 7. Content rules

- Copy is **verbatim from the current site** (`docs/copy-current-site.txt`). Allowed: shortening, merging, reordering. Not allowed: new stats, new names, new claims, new testimonials.
- English. No em dashes or en dashes anywhere (copy, alt text, comments shown to users). A sentence stops once the information is given.
- Section labels are words, not "(01)" numbering. Numbers appear only where the order is real (values 01–07).

## 8. Tech and repo layout

Vite 8 + TypeScript + Tailwind v4 (`@tailwindcss/vite`) + GSAP + Lenis.
Multi-page Vite; see [README routes](../../README.md#routes) for the current page inventory.
No React.
Static HTML first: every section's markup is in the HTML at build time (SEO, first paint), JS only enhances.

```
site-src/
  ...                       HTML page shells: see README routes
  vite.config.ts             multi-page + tiny HTML include plugin (transformIndexHtml) + /api proxy
  vercel.json
  src/
    styles/tokens.css base.css components.css   (foundation owns)
    lib/  lenis.ts motion.ts split.ts odometer.ts spring.ts glass.ts reveal.ts marquee.ts cursor.ts  (foundation owns)
    chrome/ nav.ts nav.css footer.html footer.ts footer.css preloader.ts  (foundation owns)
    sections/<name>.html <name>.ts <name>.css    (one owner per section)
    pages/                                      (entry points; home.ts imports each section's init)
  public/ fonts/ img/ brand/ favicon.svg og.png
  assets-src/                raw images, never shipped directly
  scripts/ smoke.mjs images.mjs
  docs/ BRIEF.md copy-current-site.txt reference-current-site/
```

**Ownership rule for parallel work:** edit only the files you own. If you need a change in a foundation file, add it in your own section file or write the request in `docs/HANDOFF.md` under your name. Section init contract: each `sections/<name>.ts` exports `init(root: HTMLElement): () => void` (returns cleanup); `pages/home.ts` calls them.

Images: generate responsive webp + avif at 480/960/1600 widths into `public/img/` with `scripts/images.mjs` (sharp), always with width/height attributes, `loading="lazy"` below the fold, `fetchpriority="high"` on the hero image.

## 9. Quality bar and verification

- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, CLS < 0.02.
- `scripts/smoke.mjs` (Playwright from `/Users/mehdiizemmour/claude/personal/roster-redesign/node_modules/playwright`): load every page at 1440×900 and 390×844, assert no horizontal overflow, no console errors, every `[data-reveal]` visible after scroll, take screenshots into `qa/`.
- Mobile layouts are checked with Playwright at real 390px, not the browser pane emulation.
- Focus visible everywhere (cobalt ring), keyboard reachable accordion and values list, alt text on every image, `lang="en"`.
- Run `pnpm build` clean (tsc no errors) before declaring done.
