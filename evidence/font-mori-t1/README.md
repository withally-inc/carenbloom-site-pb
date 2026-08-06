# PP Mori display restoration evidence

Captured locally on 2026-08-06 through `chrome-devtools-axi` against the dry-run development server.
All screenshots use the stated CSS viewport at device scale factor 1.

## Before and after

| Viewport | Syne before | PP Mori after |
| --- | --- | --- |
| 390×844 hero | `before/390x844-hero.png` | `after/390x844-hero.png` |
| 390×844 footer | `before/390x844-footer.png` | `after/390x844-footer.png` |
| 1440×900 hero | `before/1440x900-hero.png` | `after/1440x900-hero.png` |
| 1440×900 values | `before/1440x900-values.png` | `after/1440x900-values.png` |
| 1440×900 footer | `before/1440x900-footer.png` | `after/1440x900-footer.png` |
| 2560×1440 hero | `before/2560x1440-hero.png` | `after/2560x1440-hero.png` |
| 2560×1440 footer | `before/2560x1440-footer.png` | `after/2560x1440-footer.png` |

The final hero keeps the original PP Mori proportions from commit `94be120`, including its responsive scale and spacing.
The final values heading remains legible and balanced with the existing ledger and deck composition.
The PP Mori footer retune fills 89.4% of every tested viewport, preserves every letter top, and maintains a shallow bottom crop without horizontal overflow.

## Runtime measurements

| Width | Hero size | Values size | Footer size | Footer fill | Bottom crop | Overflow |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 320 | 56px | 34px | 40.64px | 89.4% | 2.98px | 0px |
| 390 | 68.25px | 35.1px | 49.53px | 89.4% | 3.78px | 0px |
| 768 | 119.04px | 40px | 97.536px | 89.4% | 6.56px | 0px |
| 1024 | 158.72px | 47.104px | 130.048px | 89.4% | 9.75px | 0px |
| 1440 | 223.2px | 66px | 182.88px | 89.4% | 13.44px | 0px |
| 1920 | 224px | 66px | 243.84px | 89.4% | 17.91px | 0px |
| 2560 | 224px | 66px | 325.12px | 89.4% | 23.88px | 0px |

Computed styles reported `PP Mori` for display and footer surfaces and `Azeret Mono` for utility text at every width.
PP Mori Regular and Semibold are the only weights used, matching the two self-hosted files, so no synthetic bold is required.

## Mobile topbar decision

The mobile topbar adjustments introduced with Azeret Mono remain.
At 320px, the tuned Azeret mark measures 92px in a 92px box.
Restoring the parent values would place 105px of text in an 85px box and ellipsize the full mark.
