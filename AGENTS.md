# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `README.md` is the authority for routes, local commands, review deployment boundaries, rollback, and the unresolved `datePosted` production blocker.
- `scripts/careers-roles.js` owns all eleven canonical role records and their optional physical locations, and is imported by both the application page and `/api/applications` as the single server-side role authority.
- Review application traffic must remain dry-run-only, and `npm test` proves the application boundary without a real Notion write.
- `scripts/package-deployment.mjs` owns the strict Vercel runtime allowlist for the existing `carenbloom-redesign-a` review project.
- The (01) Operating record band is the captain-approved Candidate 03 stepped lemon march: `assets/lemon-march/` (one 3600×360 sprite + the static print-master fallback) driven by `#lemonBand` in `index.html` and the driver in `app.js`. Phases change via `object-position` only — never `img.src` swaps (they refetch). `tests/lemon-band.test.mjs` owns the behavioral contract.
- `nav-float.js` owns the floating-navigation threshold/hysteresis state and is imported by `app.js`; `.nav-shell`/`.topbar` rules in `style.css` own the material, and `tests/nav-float*.test.mjs` cover top/floating/mobile/reduced-motion behavior.
- `tokens.css` owns the production PP Mori display/body and Azeret Mono utility roles; their self-hosted binaries and the Azeret OFL text live in `fonts/`, and the 320px full-mark regression is pinned in `tests/nav-float-browser.test.mjs`.
- The homepage opening sequence (blank art side → wordmark beat → hero emergence → scroll-earned satellite chips) is driven by `.js-live`/`.arrived`/`.settled`/`.chip-in`: pure logic in `hero-scroll.js` (`chipRevealCount`, `resolveOpeningMode`), the driver in `app.js`, the CSS opening block in `style.css`. Pre-reveal hiding requires `.js-live`, granted by the render-blocking head script in `index.html` (which also arms a 4s release so a blocked or failed module still prints the page whole) and owned by `app.js` once it wires the ceremony (`window.__cbOpeningRelease`) — never hide opening content behind the inline `.js` class alone. `tests/hero-reveal-browser.test.mjs` owns the behavioral contract.
- The footer sign-off is flat, static, always-visible PP Mori text owned by `[data-footer-wordmark]` in `index.html` and its typography/crop rules in `style.css`; it has no arming, observer, or motion in `app.js`, `tests/footer-wordmark.test.mjs` pins the static contract on every arrival path, and `evidence/footer-wordmark-f1/README.md` records the original Syne-era divergences from the Mobbin reference.
- Homepage performance is owned by `critical.css` (the minified whole of `style.css`, regenerated whenever `style.css` changes), the head stylesheet script in `index.html`, AVIF `<picture>` sources, and `shouldLoadHeroVideo` in `hero-scroll.js`; `tests/hero-performance-browser.test.mjs` and `evidence/perf-slow-mobile-p1/README.md` hold the slow-mobile contract and measured baseline.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
