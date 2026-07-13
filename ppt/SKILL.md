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

## Runtime adaptation

Use the capabilities available in the current agent environment.

### Codex

- Prefer native image understanding, image generation/editing, browser, screenshot, and shell tools when available.
- Generate visual style previews when the design direction is not already fixed.
- Use browser screenshots for final visual verification, not DOM checks alone.

### Claude Code

- Use the same files and workflow without Claude-only frontmatter or command syntax.
- Use shell and browser automation when available.
- Do not assume Codex-only image or browser tools exist. Fall back to supplied images, CSS visuals, placeholders, and the bundled Playwright scripts.

### Other coding agents

- Require only filesystem access for deck generation.
- Treat image generation and browser automation as optional enhancements.

## Determine the task mode

Choose one route:

1. **Create** — Build a new deck from a topic, notes, documents, data, or images.
2. **Convert** — Rebuild an existing PPT/PDF/document as an HTML deck while preserving meaning and order.
3. **Redesign** — Improve an existing HTML deck without losing content.
4. **Edit** — Make targeted content, visual, image, or structural changes.
5. **Validate/export** — Inspect, screenshot, bundle, or export an existing deck.

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

Read [`references/workflow.md`](references/workflow.md) for planning, content architecture, and mode-specific rules.

### 2. Build the narrative before styling

Create a slide map with one job per slide. Use a clear arc:

- hook
- context
- core argument or evidence
- shift / decision
- takeaway / action

Select layouts by communication purpose, not visual novelty. Read [`references/layouts.md`](references/layouts.md).

For data-heavy work, verify calculations and labels before visualizing. Do not fabricate sources, metrics, logos, quotes, or citations.

### 3. Choose a design direction

When the user has not fixed a style, create three genuine title-slide previews using real deck content:

- one restrained direction
- one expressive direction
- one context-specific wildcard

Do not put workflow labels, template names, or internal notes on the previews. If interaction with the user is not practical, choose the strongest direction and document the choice.

Read:

- [`references/styles.md`](references/styles.md)
- [`references/design-system.md`](references/design-system.md)
- [`references/cjk-typography.md`](references/cjk-typography.md) for Chinese or mixed CJK decks

### 4. Initialize the development project

For a new deck, use the project generator instead of manually copying or duplicating runtime code:

```bash
node scripts/create-deck.mjs \
  --name deck-name \
  --title "Presentation title" \
  --lang zh-CN \
  --output /absolute/path/to/project
```

The generated project contains:

```text
project/
├── index.html
├── deck.json
├── README.md
├── images/
└── runtime/
    ├── viewport-base.css
    ├── deck-runtime.js
    └── deck-editor.js
```

Use `--force` only when intentionally replacing generated files inside an existing directory. It must not be used to delete unrelated content.

For an existing deck, preserve its working project structure and stable IDs instead of regenerating it.

### 5. Generate the deck

Edit the generated `index.html`. The development file references the canonical runtime copies in `runtime/`; do not paste a second minified runtime into it.

Required markup:

```html
<div class="deck-viewport">
  <main class="deck-stage" id="deckStage" data-deck-id="meaningful-id">
    <section class="slide active visible" data-slide-id="slide-01" data-layout="cover">
      ...
    </section>
  </main>
</div>
```

Editing hooks:

- Add `data-editable="text"` and a stable `data-element-id` to editable text.
- Add `data-editable="image"`, `data-element-id`, and `data-image-slot` to replaceable images.
- Keep decorative elements uneditable unless there is a clear user benefit.
- Read [`references/editing-contract.md`](references/editing-contract.md).

Image rules:

- Use supplied assets before generating replacements.
- Preserve screenshot text, brands, numbers, and interface details when fidelity is required.
- Match the slot ratio before placing or generating an image.
- Use `object-fit` and `object-position`; never distort images.
- Do not repeat the same non-logo image across multiple slides without a narrative reason.

### 6. Validate visually and mechanically

Run the dependency-free structural validator against the development file:

```bash
node scripts/validate-deck.mjs /absolute/path/to/project/index.html
```

The validator resolves local runtime dependencies, so development HTML and bundled HTML follow the same structural contract.

For browser QA and screenshots:

```bash
npm install
npx playwright install chromium
node scripts/qa-deck.mjs /absolute/path/to/project/index.html --screenshots /absolute/path/to/qa
```

Inspect every screenshot. Fix the underlying layout rather than hiding warnings. At minimum verify:

- stage remains 16:9
- no clipping or unintended overlap
- text is readable at presentation distance
- Chinese line breaks and punctuation are deliberate
- images load, crop correctly, and retain required details
- the deck has visual rhythm rather than repeating one layout
- editing mode does not alter playback layout

Read [`references/quality-checklist.md`](references/quality-checklist.md).

### 7. Bundle the final single-file HTML

After the development deck passes validation and visual QA, bundle it:

```bash
node scripts/bundle-html.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/dist/presentation.html
```

The bundler embeds local stylesheets, JavaScript, images, fonts, SVG, audio, video, icons, and CSS `url()` assets. It preserves and reports remote URLs rather than downloading them.

Validate the bundled output again:

```bash
node scripts/validate-deck.mjs /absolute/path/to/dist/presentation.html
```

Do not deliver the development folder as the only artifact when the user requested a portable single HTML file.

### 8. Deliver

Open the bundled HTML locally and report:

- file path
- slide count
- selected design direction
- navigation: arrows, space, wheel, swipe
- editing: press `E`, click text, click an editable image, `Ctrl/Cmd+S` to download
- validation and screenshot QA performed
- any remote font or media references that still require a network connection

Optional PDF export:

```bash
node scripts/export-pdf.mjs /absolute/path/to/dist/presentation.html [output.pdf]
```

PDF is a static snapshot; browser editing and animation are not preserved.

## Modification rules

When editing an existing deck:

- Preserve working runtime and editor behavior.
- Count content before adding more. Split slides rather than shrinking text into unreadability.
- Reuse the established tokens, grid, typography, and component grammar.
- Keep stable `data-slide-id` and `data-element-id` values unless an element is intentionally replaced.
- After every structural change, rerun validation and inspect affected slides in the browser.
- Never use `display: none` / `display: block` as the primary slide visibility mechanism; use `active` / `visible` with visibility, opacity, and pointer events.
- Keep development runtime code in `runtime/` and use `bundle-html.mjs` for final inlining; do not maintain duplicate runtime implementations.

## Resource loading guide

Load only what the current task requires:

| Resource | Use |
|---|---|
| `references/workflow.md` | Planning, source handling, narrative architecture |
| `references/styles.md` | Style discovery and visual territories |
| `references/design-system.md` | Tokens, grids, components, motion |
| `references/cjk-typography.md` | Chinese and mixed-language typography |
| `references/layouts.md` | Layout selection and slot contracts |
| `references/editing-contract.md` | Browser editing and stable element IDs |
| `references/quality-checklist.md` | Final QA |
| `assets/templates/starter.html` | Development starter used by the generator |
| `assets/runtime/*` | Canonical fixed-stage and editor runtime |
| `scripts/create-deck.mjs` | Initialize a deck project |
| `scripts/bundle-html.mjs` | Produce portable single-file HTML |
| `scripts/validate-deck.mjs` | Structural validation for development or bundled HTML |
| `scripts/qa-deck.mjs` | Rendered browser QA and screenshots |
| `scripts/export-pdf.mjs` | Static PDF export |
