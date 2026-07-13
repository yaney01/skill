# Layout library and slot contracts

Use layout names in `data-layout`. Layouts define communication structure, not a rigid visual skin.

## Core layouts

| ID | Name | Best use | Primary contract |
|---|---|---|---|
| L01 | `cover` | title and positioning | one dominant title, optional subtitle/meta, one visual thesis |
| L02 | `section` | chapter transition | short title, index/label, generous negative space |
| L03 | `statement` | key claim or shift | one sentence or number, minimal support |
| L04 | `split` | explanation + image | 5/7 or 6/6 text/image split |
| L05 | `image-focus` | product, evidence, photography | 16:9, 16:10, 4:3, or full-bleed image slot plus concise caption |
| L06 | `three-up` | three ideas, features, examples | three equal or intentionally weighted columns |
| L07 | `four-grid` | compact categories | 2×2 grid; each cell must have comparable information |
| L08 | `metrics` | KPI summary | 1–4 metrics with explicit labels, units, and period |
| L09 | `comparison` | before/after or option A/B | mirrored structure and shared comparison criteria |
| L10 | `timeline` | chronological change | 3–7 milestones with consistent date hierarchy |
| L11 | `process` | sequence or workflow | 3–6 steps, directional logic, clear start/end |
| L12 | `chart` | quantitative evidence | one chart, conclusion headline, source and unit |
| L13 | `quote` | testimony or principle | quote, attribution, optional portrait; no fake quotes |
| L14 | `evidence-wall` | screenshots or artifacts | 2–6 images with captions and deliberate focus |
| L15 | `roadmap` | phases and ownership | time axis or swimlanes, status and dependencies |
| L16 | `closing` | synthesis or action | one takeaway, decision, or next step; contact only if useful |

## Image-slot ratios

Declare an image's intended slot:

```html
<img
  data-editable="image"
  data-element-id="slide-05-product"
  data-image-slot="16:10"
  src="assets/product.webp"
  alt="Product dashboard"
/>
```

Supported baseline ratios:

- `21:9` — cinematic header, wide product context
- `16:10` — product UI and laptop-like screenshots
- `16:9` — standard media and diagrams
- `4:3` — documents, dashboards, older screenshots
- `3:2` — editorial photography
- `1:1` — portraits, icons, compact evidence tiles
- `9:16` — mobile UI; usually paired with text or multiple devices

Do not place a tall mobile screenshot into a wide slot by stretching it. Change the layout or compose multiple panels.

## Density limits

These are warning thresholds, not goals:

- cover: title + subtitle + up to two metadata lines
- statement: one central claim and one supporting line
- split: one headline, one short paragraph or 3–5 bullets, one image
- three-up: up to 45 CJK characters or ~70 Latin words per card including labels
- four-grid: up to 30 CJK characters or ~45 Latin words per cell
- metrics: one label, one value, one comparison/context line per metric
- process: 3–6 steps; split longer processes
- evidence wall: captions must remain legible and images must not become thumbnails without informational value

## Selection rules

- Use `statement` or `section` to reset attention after dense slides.
- Use `chart` only when the quantitative encoding improves understanding.
- Use `comparison` only with explicit shared criteria.
- Use `three-up`/`four-grid` when items are genuinely parallel.
- Use `evidence-wall` for proof, not decoration.
- Use `image-focus` when the image itself is the evidence.
- Avoid more than two consecutive slides with the same layout unless repetition is intentional, such as a case-study sequence.
