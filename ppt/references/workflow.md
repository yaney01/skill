# Workflow and content architecture

## 1. Source intake and standardization

Prefer authoritative source material supplied by the user. When the source is PPTX, PDF, DOCX, or Markdown, normalize it before designing the narrative:

```bash
python3 scripts/ingest-source.py input.pptx --output project/source
node scripts/validate-source.mjs project/source/manifest.json --source input.pptx --strict
```

Read [`source-ingestion.md`](source-ingestion.md) for the complete contract.

The standardized source must record:

- claims and supporting evidence
- dates, names, numbers, units, and definitions
- original page or section order
- required quotations and screenshots
- extracted images, dimensions, notes, tables, and chart data
- content that may be merged, condensed, omitted, or must remain verbatim
- provenance, uncertainty, conflicts, parser warnings, and missing context

Do not treat a visual reference as factual evidence. Do not invent citations to make a slide look complete. Do not delete or overwrite the original source.

When images or screenshots are supplied, inspect them before finalizing the outline. Images and content jointly determine the slide structure; do not finish the complete narrative and then add visuals as decoration.

## 2. Brief resolution

A complete brief contains:

| Dimension | Examples |
|---|---|
| Purpose | persuade, teach, report, launch, review |
| Audience | executives, customers, technical team, general public |
| Delivery | live talk, async reading, portfolio, web publication |
| Length | slide count or speaking duration |
| Density | speaker-led or reading-first |
| Tone | authoritative, editorial, technical, premium, playful |
| Assets | logos, photos, screenshots, data, existing deck |
| Constraints | brand rules, mandatory sections, language, prohibited content |

Ask only for missing dimensions that materially change the deck.

## 3. Source-to-slide mapping

Before writing detailed HTML, create an auditable mapping from standardized source records to final slides.

| Source | Final slide | Treatment | Reason |
|---|---|---|---|
| page-001 | slide-01 | preserve | required title |
| page-002–003 | slide-02 | merge | repeated context |
| page-004 | slide-04 | redraw chart | structured data available |

Allowed treatments:

- preserve
- split
- merge
- condense
- omit with an explicit reason and permission
- redraw from extracted table/chart data
- retain screenshot pixel-faithfully

Never silently omit a source page or change a protected number, quotation, product UI, legal statement, or cited claim.

## 4. Narrative map

Use a slide map before writing detailed HTML. Every slide must have one primary job.

Recommended arc:

1. **Hook** — a contradiction, question, outcome, or decisive number
2. **Context** — what changed and why the audience should care
3. **Thesis** — the main claim or decision
4. **Evidence** — examples, data, demonstrations, comparison
5. **Shift** — implication, tradeoff, or new operating model
6. **Action** — recommendation, next steps, or decision request
7. **Close** — memorable synthesis, not a generic “Thank you” page

A report may repeat evidence sections; a tutorial may replace thesis/evidence with progressive steps.

## 5. Density modes

### Speaker-led

- one idea per slide
- 1–3 bullets or one short paragraph
- larger type and more negative space
- more slides are preferable to shrinking content
- visuals should carry part of the explanation
- no more than two consecutive plain text-only slides by default

### Reading-first

- slides are independently understandable
- 4–8 concise bullets, 3–6 cards, or a structured table may be acceptable
- use annotations, labels, sources, and explicit conclusions
- maintain strong hierarchy; do not paste a document onto the canvas

## 6. Slide map and visual plan

The slide map is stored in `deck.json`, not only in temporary prose. Use `schemas/deck.schema.json` as the production contract.

Each slide record must include:

- `id`
- `purpose`
- `headline`
- `layout`
- one explicit `visual` decision
- source provenance or source-to-slide mapping when source material exists

Visual decisions include:

- supplied or generated image
- screenshot
- chart
- workflow or system diagram
- comparison diagram
- timeline
- HTML/CSS visualization
- typographic visual
- intentional text-only page
- no visual, with a reason

For speaker-led work, start with:

```json
{
  "visualStrategy": {
    "mode": "mixed",
    "targetCoverage": 0.5,
    "targetEvidenceCoverage": 0.3,
    "maxConsecutiveTextOnly": 2
  }
}
```

`targetCoverage` includes deliberate typographic and statement pages. `targetEvidenceCoverage` only counts images, screenshots, charts, diagrams, timelines, comparisons, and semantic HTML visualizations.

Read [`visual-planning.md`](visual-planning.md) before authoring the full HTML.

## 6.1 Visual production work orders

<!-- phase-eleven-workflow -->
After the per-slide visual decisions are stable, generate an executable work order for every slide:

```bash
node scripts/validate-manifest.mjs project/deck.json --stage planning
node scripts/build-visual-work-orders.mjs project/deck.json \
  --output project/qa/visual-work-orders.json \
  --markdown project/qa/visual-work-orders.md \
  --stage planning \
  --force
node scripts/validate-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage planning
```

Use the work orders to generate images, capture screenshots, review supplied assets, and build precise HTML/SVG/chart visuals. When production is complete, synchronize approved paths, alt text, focus, prompts, and statuses into `deck.json`:

```bash
node scripts/sync-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage delivery \
  --write
```

Final delivery requires both manifest and work-order validation in `delivery` mode. Planning mode may report incomplete required visuals as warnings; delivery mode blocks them.

Read [`visual-production.md`](visual-production.md).

## 7. Style discovery

If direction is open, generate three title-slide previews using real title/subtitle/company/date content:

- **Restrained:** safest for the audience and stakes
- **Expressive:** stronger typography, color, and visual device
- **Wildcard:** directly derived from the subject matter

The previews must be viable systems, not decorative one-offs. Each must imply how content, data, section, quote, and closing slides will work.

## 8. Asset production

After the visual plan is approved or internally resolved:

1. inventory supplied and extracted assets
2. assign slot ratios
3. frame screenshots without redrawing critical UI
4. generate only the images that carry a clear narrative role
5. build diagrams, charts, and exact labels in HTML/SVG when precision matters
6. record paths, alt text, focus, source, and status in `deck.json`
7. mark required assets `ready` only when the actual file or DOM visual exists
8. retain a provenance link back to the standardized source asset

Read:

- [`image-prompts.md`](image-prompts.md)
- [`screenshot-framing.md`](screenshot-framing.md)

## 9. Generation sequence

Generate in this order:

1. standardized source import and validation when applicable
2. source-to-slide mapping
3. production manifest and visual plan
4. theme tokens
5. global grid and safe areas
6. cover and section layouts
7. representative content and visual layouts
8. remaining slides and assets
9. navigation and editor
10. structural and manifest validation
11. rendered mechanical QA
12. semantic visual QA and contact sheet
13. targeted fixes
14. final bundling and export

Do not spend time polishing every detail before one complete representative pass exists.

## 10. QA sequence

Run separate source, mechanical, and visual checks:

```bash
node scripts/validate-source.mjs project/source/manifest.json --source original.pptx --strict
node scripts/validate-deck.mjs project/index.html
node scripts/validate-manifest.mjs project/deck.json --html project/index.html --stage delivery --strict
node scripts/validate-visual-work-orders.mjs project/qa/visual-work-orders.json --deck project/deck.json --stage delivery --strict
node scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots
node scripts/qa-visual.mjs project/index.html --manifest project/deck.json --json project/qa/visual-report.json
node scripts/build-contact-sheet.mjs project/index.html project/qa/contact-sheet.png
```

Source validation confirms that the original material was extracted and indexed consistently. Mechanical QA confirms that the page is not broken. Visual QA checks coverage, evidence, sequence, repeated layouts, image-slot ratios, repeated imagery, alt text, crop focus, and declared visual requirements. The contact sheet is the final whole-deck rhythm review.

Read [`visual-quality-checklist.md`](visual-quality-checklist.md).

## 11. Conversion rules

When converting an existing deck or document:

- preserve meaning, source order, and required assets unless the user approves restructuring
- standardize source content before redesigning the visual system
- record omissions, consolidations, splits, and chart redraws
- retain speaker notes as structured data when available
- avoid tracing low-quality screenshots when the underlying text or data can be rebuilt semantically
- preserve screenshots pixel-faithfully when they are evidence or product UI
- distinguish source extraction limitations from final design decisions
- keep `source/manifest.json` and `deck.json` as separate contracts

## 12. Redesign rules

When redesigning an existing HTML deck:

- identify the established runtime before modifying it
- create a content inventory, asset inventory, and density assessment
- preserve stable IDs and working behavior
- change tokens and reusable classes before applying one-off patches
- split crowded slides instead of compressing typography
- update `deck.json` when layout or visual decisions change
- validate the whole deck after shared CSS or runtime changes
