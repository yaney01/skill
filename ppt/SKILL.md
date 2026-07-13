---
name: ppt
description: Create, redesign, edit, validate, and export polished browser-editable HTML presentations. Use for PPT, slides, pitch decks, talks, reports, web presentations, converting source material into slides, or improving an existing HTML deck. Output is fixed 16:9 HTML rather than PowerPoint. Optimized for Codex and compatible with Claude Code.
---

# HTML PPT

Create presentation-quality HTML decks that are editable in the browser and deliverable as a single HTML file. Development projects keep runtime files separate for maintainability; the final bundling step embeds local runtime and media assets into one portable HTML document.

## Non-negotiable output contract

- Produce HTML, not `.pptx`, unless the user explicitly requests a different format.
- Author every slide on a fixed `1920×1080` stage. Scale the whole stage to the viewport; never reflow slide content for phones.
- Keep every slide inside the stage with no scrolling, clipped text, accidental overlap, or content hidden under controls.
- Include browser editing by default: text editing, image replacement, local autosave, reset, and download of the edited HTML.
- Use a constrained design system. Do not build an unrestricted Canva-style free canvas.
- Final delivery must work locally by opening the HTML file. External fonts may degrade gracefully; core navigation and editing must not depend on a network connection.
- Preserve semantic HTML, keyboard navigation, touch navigation, and reduced-motion support.
- A deck is not complete merely because structural and screenshot QA pass. It must also pass the visual production contract or clearly document unresolved visual findings.

## Runtime adaptation

Use the capabilities available in the current agent environment.

### Codex

- Prefer native image understanding, image generation/editing, browser, screenshot, and shell tools when available.
- Generate visual style previews when the design direction is not already fixed.
- Use browser screenshots and a contact sheet for final visual verification, not DOM checks alone.

### Claude Code

- Use the same files and workflow without Claude-only frontmatter or command syntax.
- Use shell and browser automation when available.
- Do not assume Codex-only image or browser tools exist. Fall back to supplied images, CSS visuals, placeholders, and the bundled Playwright scripts.

### Other coding agents

- Require only filesystem access for deck generation.
- Treat image generation and browser automation as optional enhancements, but preserve the manifest and visual-planning contract.

## Determine the task mode

Choose one route:

1. **Create** — Build a new deck from a topic, notes, documents, data, or images.
2. **Convert** — Rebuild an existing PPT/PDF/document as an HTML deck while preserving meaning and order.
3. **Redesign** — Improve an existing HTML deck without losing content.
4. **Edit** — Make targeted content, visual, image, or structural changes.
5. **Validate/export** — Inspect, screenshot, visually review, bundle, or export an existing deck.

For conversion or redesign, inspect the source before proposing a new structure. Preserve source facts and explicitly identify anything omitted or condensed.

## Workflow

### 1. Resolve the brief

Use information already supplied. Ask only for missing choices that materially change the result. Prefer one compact group of questions rather than repeated interruptions.

Resolve:

- purpose and audience
- source material and required facts
- target length or speaking duration
- density: `speaker-led` or `reading-first`
- visual direction or brand constraints
- available images/screenshots and whether they must remain pixel-faithful
- hard constraints: required sections, forbidden content, language, export needs

If the user gives enough information, start without asking.

Read [`references/workflow.md`](references/workflow.md).

### 2. Inspect source assets before locking the outline

When images, screenshots, diagrams, charts, or an existing deck are supplied:

- inspect every usable asset
- identify what it proves or explains
- note dimensions, ratios, legibility, and fidelity constraints
- reject unusable assets with a reason
- let the selected assets influence the narrative map

Do not finish all slide content first and then add visuals as decoration.

### 3. Build the narrative and visual plan

Create one job per slide using a clear arc:

- hook
- context
- thesis
- evidence
- shift / decision
- action
- close

Before authoring the full HTML, update `deck.json` as the production manifest. It must include:

- `manifestVersion: 2`
- density and theme
- `visualStrategy`
- a `slides` array
- one explicit visual decision for every slide

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

Visual types are not limited to generated images. Choose among supplied images, generated illustrations, screenshots, charts, workflow diagrams, system diagrams, comparisons, timelines, HTML/CSS visualizations, typographic visuals, and intentional text-only pages.

Read:

- [`schemas/deck.schema.json`](schemas/deck.schema.json)
- [`references/visual-planning.md`](references/visual-planning.md)
- [`references/layouts.md`](references/layouts.md)

### 4. Choose a design direction

When the user has not fixed a style, create three genuine title-slide previews using real deck content:

- one restrained direction
- one expressive direction
- one context-specific wildcard

Do not put workflow labels, template names, or internal notes on the previews. If interaction with the user is not practical, choose the strongest direction and document the choice.

Read:

- [`references/styles.md`](references/styles.md)
- [`references/design-system.md`](references/design-system.md)
- [`references/cjk-typography.md`](references/cjk-typography.md) for Chinese or mixed CJK decks

### 5. Initialize the development project

For a new deck, use the generator:

```bash
node scripts/create-deck.mjs \
  --name deck-name \
  --title "Presentation title" \
  --lang zh-CN \
  --theme swiss-grid \
  --output /absolute/path/to/project
```

The generated project contains a versioned visual production manifest:

```text
project/
├── index.html
├── deck.json
├── README.md
├── images/
├── runtime/
└── theme/        # when a theme is selected
```

The generated `deck.json` is a starting manifest inferred from the template. Replace the preview content and correct every slide purpose, headline, layout, visual type, source, role, ratio, status, and path before full production.

For an existing deck, preserve its working structure and stable IDs; upgrade its legacy integer slide count to the manifest array.

### 6. Produce and frame visual assets

- Use supplied assets before generating replacements.
- Match the final slot ratio before generating or framing an image.
- Preserve screenshot text, brands, numbers, and UI details when fidelity is required.
- Use HTML/SVG for diagrams and exact labels when precision matters.
- Generated images are embedded assets, not pre-rendered slides.
- Generated images must not contain titles, captions, logos, page numbers, slide chrome, or fake UI text.
- Use `object-fit` and intentional `object-position`; never distort images.
- Do not repeat the same non-logo image without `data-reuse="allowed"` and a narrative reason.
- Add meaningful alt text.

Read:

- [`references/image-prompts.md`](references/image-prompts.md)
- [`references/screenshot-framing.md`](references/screenshot-framing.md)

### 7. Generate the deck

Edit `index.html`. Development HTML references canonical runtime copies in `runtime/`; do not paste a second minified runtime into it.

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

- `data-editable="text"` and stable `data-element-id` for editable text
- `data-editable="image"`, stable `data-element-id`, and `data-image-slot` for replaceable images
- `data-focus` for intentional image focal positions
- `data-allow-overlap` only for deliberate text-over-image compositions
- `data-reuse="allowed"` for legitimate repeated logos or persistent brand marks

Read [`references/editing-contract.md`](references/editing-contract.md).

### 8. Validate structure and manifest

Run dependency-free checks first:

```bash
node scripts/validate-deck.mjs /absolute/path/to/project/index.html
node scripts/validate-manifest.mjs \
  /absolute/path/to/project/deck.json \
  --html /absolute/path/to/project/index.html \
  --strict
```

Do not mark a required visual `ready` before the asset or DOM visual exists.

### 9. Run mechanical and semantic visual QA

Install Playwright once:

```bash
npm install
npx playwright install chromium
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

Whole-deck contact sheet:

```bash
node scripts/build-contact-sheet.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/project/qa/contact-sheet.png
```

`qa-deck.mjs` checks rendering integrity. `qa-visual.mjs` checks declared visual requirements, evidence coverage, consecutive text-only slides, repeated layouts, repeated images, alt text, source resolution, slot ratios, crop focus, and text/visual overlap. P0 blocks delivery; P1 requires review; P2 is an improvement suggestion.

Inspect every screenshot and the contact sheet. Fix the underlying design rather than hiding findings.

Read:

- [`references/quality-checklist.md`](references/quality-checklist.md)
- [`references/visual-quality-checklist.md`](references/visual-quality-checklist.md)

### 10. Bundle and revalidate

After the development deck passes both QA layers:

```bash
node scripts/bundle-html.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/dist/presentation.html
node scripts/validate-deck.mjs /absolute/path/to/dist/presentation.html
```

The bundler embeds local stylesheets, JavaScript, images, fonts, SVG, audio, video, icons, and CSS `url()` assets. It preserves and reports remote URLs rather than downloading them.

### 11. Deliver

Report:

- final file path
- slide count
- selected design direction
- visual coverage and evidence visual coverage
- navigation and editing controls
- structural, mechanical, manifest, and visual QA results separately
- contact sheet path
- unresolved P1/P2 findings
- remote references that still require a network connection

Do not summarize design quality only as “0 errors, 0 warnings” from mechanical QA.

Optional PDF export:

```bash
node scripts/export-pdf.mjs /absolute/path/to/dist/presentation.html [output.pdf]
```

## Modification rules

When editing an existing deck:

- preserve working runtime and editor behavior
- keep stable `data-slide-id` and `data-element-id` values
- update `deck.json` whenever a slide purpose, layout, or visual decision changes
- split crowded slides instead of shrinking content
- reuse established tokens and layout grammar
- rerun affected manifest, mechanical, and visual checks after structural changes
- never use `display: none` / `display: block` as the primary slide visibility mechanism
- keep development runtime code in `runtime/` and use the bundler for final inlining

## Resource loading guide

Load only what the task requires:

| Resource | Use |
|---|---|
| `references/workflow.md` | Source handling, narrative and visual production sequence |
| `references/visual-planning.md` | Per-slide visual decisions and coverage targets |
| `references/image-prompts.md` | Generated image contracts and exclusions |
| `references/screenshot-framing.md` | Pixel-faithful screenshot treatment |
| `references/visual-quality-checklist.md` | P0/P1/P2 semantic visual review |
| `references/styles.md` | Style discovery and visual territories |
| `references/design-system.md` | Tokens, grids, components, motion |
| `references/cjk-typography.md` | Chinese and mixed-language typography |
| `references/layouts.md` | Layout selection and slot contracts |
| `references/editing-contract.md` | Browser editing and stable element IDs |
| `references/quality-checklist.md` | Mechanical final QA |
| `schemas/deck.schema.json` | Production manifest schema |
| `assets/templates/starter.html` | Neutral development starter |
| `assets/runtime/*` | Canonical fixed-stage and editor runtime |
