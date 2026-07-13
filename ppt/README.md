# HTML PPT Agent Skill

A cross-agent skill for creating and converting editable, fixed-stage HTML presentations.

- **Primary environment:** Codex
- **Compatible environment:** Claude Code
- **Output:** browser-editable HTML, not native PowerPoint
- **Runtime:** zero dependencies
- **Tooling:** Node.js 20+ and Python 3; Playwright is required for rendered QA, PDF export, and browser interaction tests
- **Optional PDF tooling:** Poppler (`pdftotext`, `pdfinfo`, `pdfimages`)
- **Collaboration:** intentionally out of scope; there is no account system, backend, database, or real-time multi-user editing

## Capabilities

- Generate decks from topics, notes, data, documents, images, or existing presentations
- Normalize PPTX, DOCX, PDF, and Markdown before conversion
- Create a source-aware project with one command
- Preserve source order, images, notes, tables, chart caches, provenance, and fidelity rules
- Maintain an auditable source-page-to-final-slide mapping
- Fixed 1920×1080 slide canvas scaled to any screen
- Keyboard, wheel, swipe, and hash navigation
- Browser text editing and image replacement
- Local autosave and edited-HTML download
- Bundle runtime files and local media into one portable HTML file
- Structural validation, source validation, rendered QA, semantic visual QA, contact sheets, and PDF export
- Automated source, structure, bundling, runtime, editor, theme, CJK, manifest, and visual regression tests
- Three core themes plus two optional guizang-inspired clean-room backup themes
- Implemented Chinese and mixed CJK typography rules
- Reusable layout and image-slot contracts
- A tested 12-page Chinese regression deck under [`examples/ai-ad-workflow`](./examples/ai-ad-workflow/)

## Install for Codex

```bash
git clone https://github.com/yaney01/skill.git
mkdir -p ~/.agents/skills
ln -s "$(pwd)/skill/ppt" ~/.agents/skills/ppt
```

For a repository-scoped installation:

```bash
mkdir -p .agents/skills
ln -s /absolute/path/to/skill/ppt .agents/skills/ppt
```

Codex can invoke it explicitly as `$ppt` or load it automatically when the request matches the description.

## Install for Claude Code

```bash
git clone https://github.com/yaney01/skill.git
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skill/ppt" ~/.claude/skills/ppt
```

For a repository-scoped installation:

```bash
mkdir -p .claude/skills
ln -s /absolute/path/to/skill/ppt .claude/skills/ppt
```

Invoke it as `/ppt`, or allow Claude Code to load it automatically.

## Create a topic-only project

```bash
cd skill/ppt
node scripts/create-deck.mjs \
  --name ai-trends \
  --title "AI 广告生产的新工作流" \
  --lang zh-CN \
  --output /absolute/path/to/projects/ai-trends
```

The command refuses to write into a non-empty output directory unless `--force` is supplied. `--force` overwrites generated files without deleting unrelated files.

## Create a project from PPTX, PDF, DOCX, or Markdown

Use `--source` to make source standardization part of project creation:

```bash
node scripts/create-deck.mjs \
  --name annual-review \
  --title "年度业务复盘" \
  --source /absolute/path/to/annual-review.pptx \
  --theme swiss-grid \
  --output /absolute/path/to/projects/annual-review
```

The generator first performs source ingestion and validation in a temporary directory. It creates the project only after source preflight succeeds, so unsupported or invalid input does not leave a partial project.

Source options:

| Option | Behavior |
|---|---|
| `--source <file>` | Import PPTX, DOCX, PDF, or Markdown into `project/source/` |
| `--preserve-layout` | Record available source geometry and forbid automatic merge, condense, or omit |
| `--allow-omit` | Allow justified omissions during semantic redesign |
| `--strict-source` | Treat all source-import warnings as failures |

`--preserve-layout` and `--allow-omit` are intentionally mutually exclusive.

Examples:

```bash
# Semantic redesign; source omission remains disabled
node scripts/create-deck.mjs \
  --name report-redesign \
  --source report.docx \
  --output ./projects/report-redesign

# Close PPTX reconstruction
node scripts/create-deck.mjs \
  --name legacy-migration \
  --source legacy.pptx \
  --preserve-layout \
  --strict-source \
  --output ./projects/legacy-migration

# Explicitly permitted content reduction
node scripts/create-deck.mjs \
  --name concise-report \
  --source long-report.md \
  --allow-omit \
  --output ./projects/concise-report
```

Generated source-aware structure:

```text
annual-review/
├── index.html
├── deck.json
├── README.md
├── source/
│   ├── manifest.json
│   ├── README.md
│   ├── citations.json
│   ├── text/
│   ├── images/
│   ├── notes/
│   ├── tables/
│   └── charts/
├── images/
├── runtime/
└── theme/
```

The two manifests have separate responsibilities:

- `source/manifest.json` records what the original source contains and what must be preserved.
- `deck.json` records the final narrative, layouts, visual decisions, and source-to-slide mapping.

A source-aware `deck.json` begins with:

```json
{
  "source": {
    "manifest": "source/manifest.json",
    "originalFile": "annual-review.pptx",
    "type": "pptx",
    "mode": "semantic",
    "mapping": []
  }
}
```

Complete `source.mapping` before full production. Every source page or section must be preserved, split, merged, condensed, redrawn, retained pixel-faithfully, or explicitly omitted with a reason.

Manual import remains available:

```bash
python3 scripts/ingest-source.py source.pptx \
  --output ./project/source

node scripts/validate-source.mjs \
  ./project/source/manifest.json \
  --source source.pptx
```

See [`references/source-ingestion.md`](./references/source-ingestion.md).

## Production themes

List installed themes and their tier:

```bash
node scripts/create-deck.mjs --list-themes
```

Core themes:

| ID | Best for |
|---|---|
| `swiss-grid` | product, data, design, and technology |
| `editorial-ink` | research, industry observation, culture, and narrative |
| `technical-field` | AI systems, architecture, engineering, and technical explanation |

Optional backup themes:

| ID | Best for |
|---|---|
| `guizang-magazine` | explicit electronic-magazine / electronic-ink requests |
| `guizang-swiss` | explicit guizang Swiss-international requests |

The backup themes are independent clean-room implementations. No AGPL template, script, shader, or asset from `guizang-ppt-skill` is copied.

Create a themed project:

```bash
node scripts/create-deck.mjs \
  --name industry-review \
  --title "行业趋势观察" \
  --lang zh-CN \
  --theme editorial-ink \
  --output /absolute/path/to/projects/industry-review
```

The selected theme and shared Chinese typography layer are copied into the project, so it remains independent of the installed Skill.

## Chinese typography implementation

Every theme loads `assets/themes/shared/cjk.css`. Generated projects receive the same rules as `theme/cjk.css`.

The implemented layer includes:

- Noto / Source Han Chinese serif and sans stacks with system fallbacks
- separate Chinese display, body, and metadata roles
- restrained Chinese title tracking instead of Latin-style aggressive negative tracking
- display, title, and body line-height defaults
- strict Chinese line breaking and normal word breaking
- punctuation containment and mixed-script spacing support
- `.cjk-nowrap`, `[data-nowrap]`, and `.keep-unit` utilities

See [`references/cjk-typography.md`](./references/cjk-typography.md).

## Validate the production chain

For a source-aware project:

```bash
node scripts/validate-source.mjs \
  /absolute/path/to/project/source/manifest.json \
  --source /absolute/path/to/original.pptx

node scripts/validate-deck.mjs /absolute/path/to/project/index.html

node scripts/validate-manifest.mjs \
  /absolute/path/to/project/deck.json \
  --html /absolute/path/to/project/index.html \
  --strict
```

Rendered QA:

```bash
npm install
npx playwright install chromium

node scripts/qa-deck.mjs \
  /absolute/path/to/project/index.html \
  --screenshots /absolute/path/to/project/qa/screenshots

node scripts/qa-visual.mjs \
  /absolute/path/to/project/index.html \
  --manifest /absolute/path/to/project/deck.json \
  --json /absolute/path/to/project/qa/visual-report.json

node scripts/build-contact-sheet.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/project/qa/contact-sheet.png
```

Bundle and revalidate:

```bash
node scripts/bundle-html.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/dist/presentation.html

node scripts/validate-deck.mjs /absolute/path/to/dist/presentation.html
```

`bundle-html.mjs` embeds local stylesheets, JavaScript, images, SVG, fonts, audio, video, icons, and CSS `url()` assets. The original source and unused standardized assets are not embedded automatically.

## PDF behavior

PDF is a flattened format. The importer prefers Poppler:

```text
pdftotext
pdfinfo
pdfimages
```

When Poppler is unavailable, optional `pypdf` provides text-only extraction. OCR is not run automatically. Every PDF import records a flattened-layout warning because reading order and image-caption association require manual review.

## Real-world regression example

The example deck at [`examples/ai-ad-workflow`](./examples/ai-ad-workflow/) contains 12 Chinese slides and local SVG assets. It exercises structural validation, production-manifest validation, semantic visual QA, contact-sheet review, bundling, and browser editing.

```bash
npm run example:validate
npm run example:manifest
npm run example:visual
npm run example:bundle
node scripts/validate-deck.mjs examples/ai-ad-workflow/dist/ai-ad-workflow.html
```

## Automated tests

Core tests:

```bash
npm run test:core
```

Core coverage includes:

- PPTX, DOCX, PDF, and Markdown source extraction
- source digest and path validation
- source-aware project creation through `create-deck.mjs --source`
- semantic and layout-preserving source modes
- prevention of partial project creation after failed source preflight
- source-policy argument validation
- validating the real Chinese example
- rejecting duplicate editable IDs and missing assets
- single-file runtime and SVG bundling
- all core and backup themes
- CJK font, tracking, line-height, line-breaking, punctuation, and no-wrap rules
- generated projects containing local theme and CJK CSS

Browser tests:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

Browser coverage includes:

- fixed 1920×1080 stage behavior
- one active slide
- keyboard, hash, wheel, and touch navigation
- mobile whole-stage scaling without reflow
- edit-mode activation and exit
- text autosave and reload restoration
- image replacement with embedded Data URLs
- edited self-contained HTML download
- semantic visual QA and contact-sheet generation

Run the complete regression pipeline:

```bash
npm run ci
```

The `ci` command remains self-contained inside `ppt/`; permanent repository-level workflow configuration is not required.

## Editing controls in generated decks

- `←` / `→`, `PageUp` / `PageDown`, or `Space`: navigate
- Mouse wheel or horizontal swipe: navigate
- `Home` / `End`: first or last slide
- `E`: toggle edit mode
- Click editable text: edit in place
- Click an editable image: replace it locally
- `Ctrl/Cmd+S`: download the current edited HTML
- `Esc`: exit text editing or edit mode

## Design scope

The editor is intentionally constrained. It supports content edits and image replacement while preserving the authored grid and hierarchy. Free-form dragging, resizing, layers, cloud sync, comments, permissions, and multiplayer editing are not included.
