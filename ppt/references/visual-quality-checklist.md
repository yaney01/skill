# Visual quality checklist

Run this checklist after mechanical QA. Severity follows a production-oriented P0–P2 model.

## P0 — block delivery

- a slide marked `data-visual-required="true"` has no rendered visual
- manifest requires an image, screenshot, chart, or diagram that is missing from the DOM
- speaker-led deck exceeds its maximum consecutive plain text-only pages
- source image ratio is severely incompatible with the declared slot
- a large displayed image is sourced from a tiny thumbnail
- an image is missing meaningful alt text
- text and visual regions overlap without `data-allow-overlap`
- the same non-logo image is repeated without `data-reuse="allowed"`
- an image, chart, or diagram required by the page claim is broken or absent

## P1 — manual review required

- visual or evidence coverage is below the manifest target
- a 12-slide-or-longer deck contains only one or two evidence visual pages
- more than half of the deck uses one layout
- the same layout repeats for three or more consecutive pages
- every visual is decorative rather than explanatory or evidential
- generated images contain suspicious text, logos, page chrome, or pseudo-UI
- visual content is weakly related to the headline
- `object-fit: cover` substantially crops an image without an intentional focal position
- evidence visuals are concentrated in only one half of the deck
- a theme preview looks complete but the full deck falls back to repeated two-column/card pages

## P2 — improvement suggestion

- cover and body use unrelated visual languages
- all emphasis relies on the same color or device
- section and statement pages do not reset rhythm
- image treatment changes without narrative reason
- captions, sources, and visual roles are inconsistent
- the contact sheet lacks a clear visual center or pacing pattern

## Delivery sequence

```bash
node scripts/validate-deck.mjs project/index.html
node scripts/validate-manifest.mjs project/deck.json --html project/index.html
node scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots
node scripts/qa-visual.mjs project/index.html --manifest project/deck.json --json project/qa/visual-report.json
node scripts/build-contact-sheet.mjs project/index.html project/qa/contact-sheet.png
node scripts/bundle-html.mjs project/index.html project/dist/deck.html
node scripts/validate-deck.mjs project/dist/deck.html
```

Mechanical QA and visual QA are separate reports. “0 errors, 0 warnings” from mechanical QA does not certify visual completeness.
