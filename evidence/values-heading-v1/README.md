# Values heading evidence

The `before/` and `after/` folders pair the values section at 390×844, 1440×900, and 2560×1440.

The before captures use the original two-line markup and styling.

The after captures show the approved “Our operating values” copy as one visual line with the reveal at rest.

Automated coverage in `tests/values-heading.test.mjs` checks exact copy, one reveal child, one visual line, viewport containment, horizontal overflow, staged-to-rest motion, and the no-JavaScript visible state at the supported widths: 320, 390, 768, 1024, 1440, 1920, and 2560.
