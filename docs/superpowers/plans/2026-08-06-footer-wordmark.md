# Footer Wordmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the footer's raster halftone sign-off with an accessible, oversized, animated Syne wordmark that remains visible without JavaScript or motion.

**Architecture:** The footer retains its existing content and gains one semantic, single-line text block cropped by the bottom edge in the measured reference pattern.
`app.js` progressively attaches a one-shot `IntersectionObserver`; CSS motion is inactive until that observer is safely attached.

**Tech Stack:** Semantic HTML, existing CSS tokens, vanilla JavaScript, Node test runner, Playwright, and `chrome-devtools-axi`.

## Global Constraints

The change stays inside the homepage footer and adds no framework, build step, or animation dependency.
The display face must come from `var(--font-display)` rather than a hardcoded family.
The text must remain selectable and announced once as Care & Bloom.
The animation may change only transform and opacity.
Reduced-motion and no-JavaScript states must show the fully present wordmark.
The footer must have no layout shift or horizontal overflow at 1440px, 1024px, 768px, 390px, or 320px.
The old PNG and every obsolete `.wordmark` or `.wordmark-block` rule must be removed after confirming no other references.

---

### Task 1: Add the footer wordmark contracts

**Files:**

- Create: `tests/footer-wordmark.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: the local review server at `http://127.0.0.1:49279/`.
- Produces: static and browser contracts for semantic text, asset removal, viewport safety, motion, reduced motion, and no JavaScript.

- [x] **Step 1: Write the failing semantic runtime contract**

Navigate to the real footer and assert that `.footer-wordmark` is a paragraph with the visible text `Care & Bloom`, uses no wordmark image, and never requests `assets/wordmark-dither-stacked.png`.
Assert from computed style that the live text inherits Syne and remains selectable.

- [x] **Step 2: Write the failing browser contract**

For 1440×900, 1024×768, 768×900, 390×844, and 320×720, navigate to the footer and assert zero document overflow, containment inside the viewport, the Syne computed family, and one accessible text sign-off.
Record the pre-trigger transform and opacity, then assert the wordmark finishes at its resting transform and opacity `1` after the one-shot arrival.
Create reduced-motion and JavaScript-disabled contexts and assert the same final visible geometry without choreography.

- [x] **Step 3: Run the focused contract and verify failure**

Run `node --test tests/footer-wordmark.test.mjs`.
Expected result: failure because the live footer wordmark and its behavior do not exist yet.

### Task 2: Implement the live responsive sign-off

**Files:**

- Modify: `index.html:643-647`
- Modify: `style.css:899-901`
- Modify: `app.js` beside the existing reveal owner
- Delete: `assets/wordmark-dither-stacked.png`

**Interfaces:**

- Consumes: `--font-display`, `--ease-out`, and `--space-xl` from the existing token system.
- Produces: `.footer-wordmark`, `.footer-wordmark-clip`, `.footer-wordmark-text`, `.is-motion-ready`, and `.is-visible` as the complete footer animation contract.

- [x] **Step 1: Replace the image with semantic text**

Use one paragraph containing the single-line phrase `Care & Bloom`, so the DOM exposes one natural brand phrase without an alternate-text duplicate.

- [x] **Step 2: Add responsive typography and clipping**

Set the wordmark in `var(--font-display)` at weight 600 with a viewport-driven `clamp()` size, tight tracking, and a bottom-clipped line.
Keep the container at `max-width: 100%` and hide only visual paint overflow so the document never grows horizontally.

- [x] **Step 3: Add progressive one-shot motion**

Construct the observer first, observe the wordmark, and only then add `.is-motion-ready`.
When the block intersects at approximately 18%, add `.is-visible` and unobserve it.
If reduced motion or `IntersectionObserver` support is absent, do not add the prepared class.

- [x] **Step 4: Remove the raster owner**

Run `rg -n "wordmark-dither-stacked|wordmark-block|class=\"wordmark\"" . --glob '!docs/**' --glob '!evidence/**'`.
Delete `assets/wordmark-dither-stacked.png` only when the remaining runtime reference count is zero.

- [x] **Step 5: Run the focused contract and verify success**

Run `node --test tests/footer-wordmark.test.mjs`.
Expected result: all footer wordmark checks pass.

### Task 3: Validate the complete footer delivery

**Files:**

- Create: `evidence/footer-wordmark-f1/*.png`
- Modify: `AGENTS.md` only if a concise durable owner pointer is useful to future sessions.

**Interfaces:**

- Consumes: the completed footer implementation and project test commands.
- Produces: committed browser evidence and a clean, validated branch.

- [x] **Step 1: Run repository validation**

Run `npm test` and `git diff --check`.
Expected result: all tests pass and the diff check is clean.

- [x] **Step 2: Capture required browser states**

Use `chrome-devtools-axi` against the local server to capture the footer at 1440px, 1024px, 768px, 390px, and 320px.
Capture the wordmark before and during its transition, plus reduced-motion and no-JavaScript final states.

- [x] **Step 3: Inspect evidence and runtime measurements**

Check each image for edge alignment, vertical rhythm, nav overlap, clipping, and unintended footer regressions.
Measure document overflow, wordmark bounds, font family, transition properties, and final transform at every required state.

- [x] **Step 4: Verify project memory and commit**

Run `/Users/ivan/Projects/firstmate/bin/fm-ensure-agents-md.sh .`, update `AGENTS.md` only if the new owner boundary is broadly reusable, then commit all task-owned changes.
