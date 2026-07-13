# Layout library and slot contracts

Use canonical layout names in `data-layout`. Layouts define communication structure, not a rigid visual skin.

For themed projects, the selected layout must also exist in `theme/layout-manifest.json`. Read [`layout-registry.md`](layout-registry.md) for registration, validation, and extension rules.

## Registered core layouts

The three core themes currently guarantee 14 layouts:

| ID | Best use | Primary contract |
|---|---|---|
| `cover` | title and positioning | one dominant title, optional subtitle/meta, one visual thesis |
| `section` | chapter transition | short title, index/label, generous negative space |
| `statement` | key claim or shift | one sentence or number, minimal support |
| `split` | explanation + image | 5/7, 6/6, or 7/5 text/visual split |
| `image-focus` | product, evidence, photography | dominant 21:9, 16:10, 16:9, 4:3, or 3:2 visual plus concise caption |
| `three-up` | three ideas, features, examples | exactly three equal or intentionally weighted items |
| `four-grid` | compact categories | 2×2 grid; each cell carries comparable information |
| `metrics` | KPI summary | 1–4 metrics with labels, units, period, and context |
| `comparison` | before/after or option A/B | mirrored structure and shared criteria |
| `timeline` | chronological change | 3–7 milestones with consistent date hierarchy |
| `process` | sequence or workflow | 3–6 steps, directional logic, clear start/end |
| `chart` | quantitative evidence | one chart, conclusion headline, source, and unit |
| `quote` | testimony or principle | sourced quote, attribution, optional portrait |
| `closing` | synthesis or action | one takeaway, decision, or next step |

The semantic library also recognizes `evidence-wall` and `roadmap`, but they are not yet guaranteed across all core themes. Register and implement them before using them in a themed production deck.

`grid` is a legacy alias for `three-up`. Do not use it in new HTML or `deck.json` files.

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
- split: one headline, one short paragraph or 3–5 bullets, one visual
- image-focus: one dominant visual and one concise caption block
- three-up: up to 45 CJK characters or ~70 Latin words per card including labels
- four-grid: up to 30 CJK characters or ~45 Latin words per cell
- metrics: one label, one value, one comparison/context line per metric
- comparison: up to five shared criteria per side
- timeline: 3–7 milestones
- process: 3–6 steps; split longer processes
- chart: one primary quantitative message; split secondary charts
- quote: one sourced quotation and attribution

## Selection rules

- Use `statement` or `section` to reset attention after dense slides.
- Use `chart` only when the quantitative encoding improves understanding.
- Use `comparison` only with explicit shared criteria.
- Use `three-up` or `four-grid` only when items are genuinely parallel.
- Use `image-focus` when the image itself is the evidence.
- Avoid more than two consecutive slides with the same layout unless repetition is intentional.
- Do not select an unregistered layout and hope the Agent improvises a stable design.

## Validation

```bash
node scripts/validate-layouts.mjs --strict
node scripts/validate-manifest.mjs project/deck.json --html project/index.html --strict
```

The first command validates theme support and CSS implementation. The second validates each final slide against the copied project registry.
