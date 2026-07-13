# Phase five visual planning and semantic QA verification

Verified on GitHub Actions against the merged phase-five implementation on 2026-07-13.

## Delivered production contract

- `schemas/deck.schema.json` defines manifest version 2.
- `deck.json` contains `visualStrategy` and a per-slide production record.
- every slide declares purpose, layout, headline, and one visual decision.
- visual types include images, screenshots, charts, diagrams, timelines, HTML visualizations, typographic pages, and intentional text-only pages.
- required visuals cannot be marked complete until their asset or DOM representation exists.

## Delivered tools

- `scripts/validate-manifest.mjs` — dependency-free manifest and HTML cross-validation
- `scripts/qa-visual.mjs` — rendered P0/P1/P2 semantic visual review
- `scripts/build-contact-sheet.mjs` — whole-deck screenshot contact sheet
- `scripts/lib/visual-contract.mjs` — shared manifest and visual classification rules

## Automated tests

Core tests:

- 17 of 17 passed
- structural validation and single-file bundling remained green
- all five themes and shared CJK rules remained green
- manifest schema, valid plan, missing required visual, missing DOM visual, and generated-project manifest tests passed

Browser tests:

- 10 of 10 passed
- existing runtime and editor tests remained green
- semantic visual QA fixture passed
- three consecutive plain text-only speaker-led slides were correctly blocked
- contact-sheet fixture generated a non-empty PNG

## Real 12-slide example

Manifest validation:

- slides: 12
- visual slides: 12
- evidence visual slides declared in the manifest: 6
- text-only slides: 0
- visual coverage: 100%
- evidence coverage: 50%
- maximum consecutive plain text-only slides: 0
- result: 0 errors, 0 warnings

Rendered semantic visual QA:

- slides: 12
- visual slides: 12
- rendered evidence visual slides: 7
- unique layouts: 12
- repeated-layout maximum: 1
- images: 2
- diagrams: 2
- missing alt text: 0
- image-slot ratio mismatches: 0
- repeated images: 0
- findings: 0 P0, 0 P1, 0 P2

Bundling:

- 1 stylesheet inlined
- 2 scripts inlined
- 2 local visual assets inlined
- bundled HTML passed structural validation with 12 slides

Contact sheet:

- all 12 slides rendered into the final contact sheet
- the generated contact sheet is intentionally ignored by Git and can be reproduced with `npm run example:contact-sheet`

## Failure-driven correction

The first real-example run correctly reported two SVG assets as small images because browsers expose default intrinsic dimensions for SVG files. The rule was corrected so vector images are not evaluated with raster resolution thresholds. The page-09 radar SVG was also rebuilt on a true `5:4` viewBox to match its declared image slot rather than suppressing the ratio warning.

The full pipeline was rerun after both corrections and completed with zero P0, P1, or P2 findings.

## QA separation

The final workflow reports four distinct layers:

1. structural validation
2. production-manifest validation
3. rendered mechanical QA
4. rendered semantic visual QA plus contact-sheet review

A clean mechanical report is no longer treated as proof that a deck is visually complete.
