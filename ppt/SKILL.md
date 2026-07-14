---
name: ppt
description: Create, convert, redesign, edit, validate, and export polished browser-editable HTML presentations. Use for PPT, slides, pitch decks, talks, reports, web presentations, converting PPTX/PDF/DOCX/Markdown into slides, or improving an existing HTML deck. Output is fixed 16:9 HTML rather than PowerPoint. Optimized for Codex and compatible with Claude Code.
---

# HTML PPT

Create presentation-quality HTML decks that are editable in the browser and deliverable as a single HTML file. Development projects keep runtime files separate; the final bundling step embeds local runtime and media assets into one portable HTML document.

## Non-negotiable output contract

- Produce HTML, not `.pptx`, unless the user explicitly requests another format.
- Author every slide on a fixed `1920×1080` stage. Scale the whole stage to the viewport; never reflow slide content for phones.
- Keep every slide inside the stage with no scrolling, clipped text, accidental overlap, or content hidden under controls.
- Include constrained browser editing by default: text editing, image replacement, local autosave, reset, and edited-HTML download.
- Final delivery must open locally. Core playback and editing must not require a network connection.
- Preserve semantic HTML, keyboard navigation, touch navigation, and reduced-motion support.
- A deck is not complete merely because structural and screenshot QA pass. It must also satisfy the production manifest, synchronized visual work orders, and semantic visual QA.
- For PPTX, PDF, DOCX, or Markdown conversion, standardize and validate the source before planning the final deck. Do not bypass `source/manifest.json`.

## Runtime adaptation

Use the capabilities available in the current agent environment.

### Codex

- Prefer native image understanding, image generation/editing, browser, screenshot, and shell tools when available.
- Generate visual style previews when the direction is not fixed.
- Use browser screenshots and a contact sheet for final review, not DOM checks alone.

### Claude Code

- Use the same files and workflow without Claude-only frontmatter or command syntax.
- Use shell and browser automation when available.
- Do not assume Codex-only image or browser tools exist. Fall back to supplied images, CSS/SVG visuals, placeholders, and bundled Playwright scripts.

### Other coding agents

- Require only filesystem access for basic deck generation.
- Treat image generation and browser automation as optional enhancements, but preserve source, manifest, and visual-planning contracts.

## Determine the task mode

Choose one route:

1. **Create** — Build a deck from a topic, notes, data, images, or already structured content.
2. **Convert** — Rebuild a PPTX, PDF, DOCX, or Markdown source as an HTML deck.
3. **Redesign** — Improve an existing HTML deck without losing content.
4. **Edit** — Make targeted content, visual, image, or structural changes.
5. **Validate/export** — Inspect, screenshot, review, bundle, or export an existing deck.

For conversion, preserve source facts and explicitly record every split, merge, condensation, redraw, and omission. For redesign, preserve stable IDs and working runtime behavior.

## Workflow

### 1. Resolve the brief

Use information already supplied. Ask only for missing choices that materially change the result.

Resolve:

- purpose and audience
- source material and required facts
- target length or speaking duration
- density: `speaker-led` or `reading-first`
- visual direction or brand constraints
- available images/screenshots and fidelity requirements
- hard constraints: required sections, forbidden content, language, export needs

Read [`references/workflow.md`](references/workflow.md).

### 2. Standardize supplied source files

This step is mandatory for `.pptx`, `.pdf`, `.docx`, `.md`, `.markdown`, and `.mdown` conversion.

Preferred integrated command:

```bash
node scripts/create-deck.mjs \
  --name converted-deck \
  --title "Presentation title" \
  --source /absolute/path/to/source.pptx \
  --theme swiss-grid \
  --output /absolute/path/to/project
```

The generator performs source import and validation before creating the project. A failed source preflight must not leave a partial project.

Use semantic conversion by default. Add `--preserve-layout` when the user requests close reconstruction, migration, or visual fidelity. Add `--allow-omit` only when the user explicitly permits justified omissions. Use `--strict-source` when all importer warnings must block generation.

Manual equivalent:

```bash
python3 scripts/ingest-source.py source.pptx \
  --output /absolute/path/to/project/source

node scripts/validate-source.mjs \
  /absolute/path/to/project/source/manifest.json \
  --source /absolute/path/to/source.pptx
```

Use `--strict` for controlled PPTX, DOCX, and Markdown input. PDF imports normally produce a flattened-layout warning that requires manual review. OCR is not automatic.

Read:

- [`references/source-ingestion.md`](references/source-ingestion.md)
- [`schemas/source.schema.json`](schemas/source.schema.json)

### 3. Inspect source and visual assets

Before locking the outline:

- inspect every usable extracted or supplied asset
- identify what it proves or explains
- note dimensions, ratios, legibility, and fidelity constraints
- review all importer warnings
- reject unusable assets with a reason
- let selected assets influence the narrative map

Do not finish the full narrative and then add visuals as decoration.

### 4. Build an auditable source-to-slide map

When `source/manifest.json` exists, complete `deck.json.source.mapping` before full production.

Each mapping record must contain:

```json
{
  "sourceIds": ["page-002", "page-003"],
  "slideIds": ["slide-02"],
  "treatment": "merge",
  "reason": "The two source pages repeat the same context."
}
```

Allowed treatments:

- `preserve`
- `split`
- `merge`
- `condense`
- `omit`
- `redraw-chart`
- `retain-pixel-faithful`

An omission must have an explicit reason and an empty `slideIds` array. Do not silently drop source pages, protected numbers, quotations, legal text, product UI, or cited evidence.

### 5. Build the narrative and visual plan

Create one job per slide using a clear arc:

- hook
- context
- thesis
- evidence
- shift / decision
- action
- close

Before authoring the full HTML, update `deck.json`. It must include:

- `manifestVersion: 2`
- density and theme
- source contract when applicable
- `visualStrategy`
- a `slides` array
- one visual decision for every slide

Typical speaker-led defaults:

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

Visual types include supplied/generated images, screenshots, charts, workflow diagrams, system diagrams, comparisons, timelines, HTML/CSS visualizations, typographic visuals, and intentional text-only pages.

Read:

- [`schemas/deck.schema.json`](schemas/deck.schema.json)
- [`references/visual-planning.md`](references/visual-planning.md)
- [`references/layouts.md`](references/layouts.md)

### 6. Choose a design direction

When style is not fixed, create three genuine title-slide previews using real content:

- one restrained direction
- one expressive direction
- one context-specific wildcard

Do not show internal workflow labels or template names on user-facing previews.

Read:

- [`references/styles.md`](references/styles.md)
- [`references/design-system.md`](references/design-system.md)
- [`references/cjk-typography.md`](references/cjk-typography.md) for Chinese or mixed CJK decks

### 7. Initialize the development project

Topic-only project:

```bash
node scripts/create-deck.mjs \
  --name deck-name \
  --title "Presentation title" \
  --lang zh-CN \
  --theme swiss-grid \
  --output /absolute/path/to/project
```

Source-aware project:

```bash
node scripts/create-deck.mjs \
  --name deck-name \
  --title "Presentation title" \
  --lang zh-CN \
  --source /absolute/path/to/source.docx \
  --theme editorial-ink \
  --output /absolute/path/to/project
```

Generated structure:

```text
project/
├── index.html
├── deck.json
├── README.md
├── source/        # when --source is supplied
├── images/
├── runtime/
└── theme/         # when a theme is selected
```

The generated `deck.json` is only a starting manifest. Correct every slide purpose, headline, layout, visual type, source, role, ratio, status, and path. When a source exists, complete the mapping before authoring the final narrative.

### 8. Produce and frame visual assets

- Use supplied and extracted assets before generating replacements.
- Match the final slot ratio before generating or framing an image.
- Preserve screenshot text, brands, numbers, and UI details when fidelity is required.
- Use HTML/SVG for diagrams and exact labels.
- Generated images are embedded assets, not pre-rendered slides.
- Generated images must not contain titles, captions, logos, page numbers, slide chrome, or fake UI text.
- Use intentional `object-fit` and `object-position`; never distort images.
- Do not repeat a non-logo image without `data-reuse="allowed"` and a narrative reason.
- Add meaningful alt text.

Read:

- [`references/image-prompts.md`](references/image-prompts.md)
- [`references/screenshot-framing.md`](references/screenshot-framing.md)

### 8.1 Execute and synchronize visual work orders

<!-- phase-eleven-skill -->
Every generated project includes `qa/visual-work-orders.json` and `qa/visual-work-orders.md`. Regenerate them after changing slide purpose, layout, visual type, source, role, or slot:

```bash
node scripts/build-visual-work-orders.mjs project/deck.json \
  --output project/qa/visual-work-orders.json \
  --markdown project/qa/visual-work-orders.md \
  --stage planning \
  --force
```

Complete the work orders using the available environment. Generated images, screenshots, supplied files, HTML/SVG diagrams, charts, and intentional typography all remain valid production routes.

Synchronize completed work before delivery validation:

```bash
node scripts/sync-visual-work-orders.mjs \
  project/qa/visual-work-orders.json \
  --deck project/deck.json \
  --stage delivery \
  --write
```

Read [`references/visual-production.md`](references/visual-production.md).

### 9. Generate the deck

Edit `index.html`. Development HTML references canonical runtime copies in `runtime/`; do not paste duplicate minified runtime code.

Required structure:

```html
<div class="deck-viewport">
  <main class="deck-stage" id="deckStage" data-deck-id="meaningful-id">
    <section
      class="slide active visible"
      data-slide-id="slide-01"
      data-layout="cover"
    >
      ...
    </section>
  </main>
</div>
```

Visual semantics:

```html
<section
  class="slide"
  data-slide-id="slide-07"
  data-layout="process"
  data-visual-required="true"
>
  <div
    data-visual-type="workflow-diagram"
    data-visual-role="explanation"
  >...</div>
</section>
```

Editing hooks:

- `data-editable="text"` and stable `data-element-id`
- `data-editable="image"`, stable `data-element-id`, and `data-image-slot`
- `data-focus` for image focal positions
- `data-allow-overlap` only for deliberate text-over-image compositions
- `data-reuse="allowed"` for legitimate repeated logos or persistent marks

Read [`references/editing-contract.md`](references/editing-contract.md).

### 10. Validate source, structure, and production manifest

Run dependency-free checks first:

```bash
node scripts/validate-source.mjs \
  /absolute/path/to/project/source/manifest.json \
  --source /absolute/path/to/original.pptx

node scripts/validate-deck.mjs /absolute/path/to/project/index.html

node scripts/validate-manifest.mjs \
  /absolute/path/to/project/deck.json \
  --html /absolute/path/to/project/index.html \
  --stage delivery \
  --strict

node scripts/validate-visual-work-orders.mjs \
  /absolute/path/to/project/qa/visual-work-orders.json \
  --deck /absolute/path/to/project/deck.json \
  --stage delivery \
  --strict
```

Skip `validate-source.mjs` only when the project has no standardized source. Do not mark a required visual `ready` before the asset or DOM visual exists.

### 11. Run mechanical and semantic visual QA

Install Playwright once:

```bash
npm ci
npx playwright install chromium webkit
```

Mechanical QA:

```bash
node scripts/qa-deck.mjs \
  /absolute/path/to/project/index.html \
  --screenshots /absolute/path/to/project/qa/screenshots
```

Semantic visual QA:

```bash
node scripts/qa-visual.mjs \
  /absolute/path/to/project/index.html \
  --manifest /absolute/path/to/project/deck.json \
  --json /absolute/path/to/project/qa/visual-report.json
```

Accessibility QA:

```bash
node scripts/qa-accessibility.mjs \
  /absolute/path/to/project/index.html \
  --browser chromium \
  --json /absolute/path/to/project/qa/accessibility-report.json

HTML_PPT_BROWSER=webkit npm run test:browser-smoke
HTML_PPT_BROWSER=webkit npm run test:accessibility
```

Whole-deck contact sheet:

```bash
node scripts/build-contact-sheet.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/project/qa/contact-sheet.png
```

`qa-deck.mjs` checks rendering integrity. `qa-visual.mjs` checks declared visual requirements, evidence coverage, consecutive text-only slides, repeated layouts/images, alt text, source resolution, slot ratios, crop focus, and text/visual overlap. `qa-accessibility.mjs` checks document language, titles, stable IDs, slide exposure state, image alt attributes, control names, ARIA references, approximate contrast, and runtime errors. Chromium and WebKit release gates must pass. P0 blocks delivery; P1 requires review; P2 is an improvement suggestion.

Read:

- [`references/quality-checklist.md`](references/quality-checklist.md)
- [`references/visual-quality-checklist.md`](references/visual-quality-checklist.md)

### 12. Bundle, revalidate, and deliver

```bash
node scripts/bundle-html.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/dist/presentation.html

node scripts/validate-deck.mjs /absolute/path/to/dist/presentation.html
```

The bundler embeds local stylesheets, JavaScript, images, fonts, SVG, audio, video, icons, and CSS `url()` assets. It does not automatically embed the original source or unused standardized assets.

Report:

- final file path and slide count
- selected design direction
- source import and mapping status when applicable
- visual and evidence coverage
- navigation and editing controls
- structural, source, mechanical, manifest, visual, accessibility, and cross-browser QA separately
- accessibility report and contact sheet paths
- unresolved P1/P2 findings
- remaining remote references

Do not summarize design quality only as “0 errors, 0 warnings” from mechanical QA.

Optional PDF export:

```bash
node scripts/export-pdf.mjs /absolute/path/to/dist/presentation.html [output.pdf]
```

## Modification rules

When editing an existing deck:

- preserve runtime and editor behavior
- keep stable `data-slide-id` and `data-element-id` values
- update `deck.json` whenever slide purpose, layout, visual decision, or source mapping changes
- split crowded slides instead of shrinking content
- reuse established tokens and layout grammar
- rerun affected source, manifest, mechanical, and visual checks
- never use `display: none` / `display: block` as the primary slide visibility mechanism
- keep development runtime code in `runtime/` and use the bundler for final inlining
- keep browser editing constrained to existing `data-editable` elements; do not add free dragging, arbitrary coordinates, or structural page editing
- preserve stable `data-element-id` values so versioned edit-state JSON and local autosave remain compatible

## Resource loading guide

Load only what the task requires:

| Resource | Use |
|---|---|
| `references/workflow.md` | End-to-end production sequence and source-to-slide mapping |
| `references/source-ingestion.md` | PPTX/PDF/DOCX/Markdown normalization and fidelity rules |
| `schemas/source.schema.json` | Standardized source-manifest contract |
| `schemas/deck.schema.json` | Final production manifest and source-mapping contract |
| `references/visual-planning.md` | Per-slide visual decisions and coverage targets |
| `references/visual-production.md` | Work-order generation, fulfillment, synchronization, and delivery checks |
| `schemas/visual-work-orders.schema.json` | Visual production work-order contract |
| `references/image-prompts.md` | Generated image contracts and exclusions |
| `references/screenshot-framing.md` | Pixel-faithful screenshot treatment |
| `references/visual-quality-checklist.md` | P0/P1/P2 semantic visual review |
| `references/styles.md` | Style discovery and visual territories |
| `references/design-system.md` | Tokens, grids, components, and motion |
| `references/cjk-typography.md` | Chinese and mixed-language typography |
| `references/layouts.md` | Layout selection and slot contracts |
| `references/editing-contract.md` | Versioned constrained browser editing and stable element IDs |
| `schemas/edit-state.schema.json` | Browser edit-state import/export contract |
| `references/presenter-mode.md` | Presenter notes, popup, overview, and offline behavior |
| `references/accessibility-qa.md` | Automated and manual accessibility release checks |
| `references/release-ci.md` | Permanent CI, deterministic installation, browser gates, and artifacts |
| `CHANGELOG.md` | Versioned capability and compatibility history |
| `MIGRATIONS.md` | Project, manifest, edit-state, and release upgrade procedures |
| `references/quality-checklist.md` | Mechanical final QA |
| `assets/templates/starter.html` | Neutral development starter |
| `assets/runtime/*` | Canonical fixed-stage and editor runtime |
