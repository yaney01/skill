# HTML PPT Agent Skill

A cross-agent Skill for creating and converting editable, fixed-stage HTML presentations.

- **Primary environment:** Codex
- **Compatible environment:** Claude Code
- **Output:** browser-editable HTML, not native PowerPoint
- **Runtime:** zero dependencies
- **Tooling:** Node.js 20+ and Python 3
- **Rendered QA:** Playwright Chromium
- **Optional PDF tooling:** Poppler (`pdftotext`, `pdfinfo`, `pdfimages`)
- **Collaboration:** intentionally out of scope; no backend, accounts, database, or multiplayer editing

## Capabilities

- Generate decks from topics, notes, data, images, documents, or existing presentations
- Normalize PPTX, DOCX, PDF, and Markdown before conversion
- Preserve source order, images, speaker notes, tables, chart caches, provenance, and fidelity rules
- Maintain an auditable source-page-to-final-slide mapping
- Fixed 1920×1080 canvas scaled as a whole to any viewport
- Keyboard, wheel, swipe, hash, overview, and numbered-jump navigation
- Lightweight presenter window with current/next previews, private notes, timer, and bidirectional control
- Browser text editing and image replacement
- Local autosave and edited-HTML download
- Bundle runtime, adjacent `deck.json`, and local media into one portable HTML file
- Structural, source, layout, manifest, mechanical, and semantic visual QA
- Contact sheets and PDF export
- Registered production layouts and Chinese/CJK typography rules
- Deterministic task-level regression across topic-only, source-backed, data-heavy, long-CJK, and offline cases

The tested 12-page Chinese example is under [`examples/ai-ad-workflow`](./examples/ai-ad-workflow/).

## Install

### Codex

```bash
git clone https://github.com/yaney01/skill.git
mkdir -p ~/.agents/skills
ln -s "$(pwd)/skill/ppt" ~/.agents/skills/ppt
```

Invoke as `$ppt`, or allow automatic matching.

### Claude Code

```bash
git clone https://github.com/yaney01/skill.git
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skill/ppt" ~/.claude/skills/ppt
```

Invoke as `/ppt`, or allow automatic matching.

Repository-scoped installations can use `.agents/skills/ppt` or `.claude/skills/ppt` symlinks instead.

## Create a topic-only project

```bash
cd skill/ppt
node scripts/create-deck.mjs \
  --name ai-trends \
  --title "AI 广告生产的新工作流" \
  --lang zh-CN \
  --theme swiss-grid \
  --output /absolute/path/to/projects/ai-trends
```

The command refuses to write into a non-empty directory unless `--force` is supplied. `--force` replaces generated files without deleting unrelated files.

## Create from PPTX, PDF, DOCX, or Markdown

Use `--source` so standardization is part of project creation:

```bash
node scripts/create-deck.mjs \
  --name annual-review \
  --title "年度业务复盘" \
  --source /absolute/path/to/annual-review.pptx \
  --theme swiss-grid \
  --output /absolute/path/to/projects/annual-review
```

The generator imports and validates the source in a temporary directory before creating the project. Invalid input does not leave a partial project.

| Option | Behavior |
|---|---|
| `--source <file>` | Import PPTX, DOCX, PDF, or Markdown into `project/source/` |
| `--preserve-layout` | Record available geometry and forbid automatic merge, condense, or omit |
| `--allow-omit` | Allow explicitly justified omissions during semantic redesign |
| `--strict-source` | Treat every source-import warning as a failure |

`--preserve-layout` and `--allow-omit` are mutually exclusive.

Generated source-aware structure:

```text
project/
├── index.html
├── deck.json
├── README.md
├── source/
│   ├── manifest.json
│   ├── text/
│   ├── images/
│   ├── notes/
│   ├── tables/
│   └── charts/
├── images/
├── runtime/
└── theme/
```

The manifests have separate responsibilities:

- `source/manifest.json` records source truth and preservation constraints.
- `deck.json` records the final narrative, layouts, visuals, presenter notes, and source-to-slide mapping.

Every source page or section must be preserved, split, merged, condensed, redrawn, retained pixel-faithfully, or explicitly omitted with a reason.

Manual import remains available:

```bash
python3 scripts/ingest-source.py source.pptx --output ./project/source
node scripts/validate-source.mjs \
  ./project/source/manifest.json \
  --source source.pptx
```

See [`references/source-ingestion.md`](./references/source-ingestion.md).

## Production themes and layouts

List themes:

```bash
node scripts/create-deck.mjs --list-themes
```

Core themes:

| ID | Best for |
|---|---|
| `swiss-grid` | product, data, design, and technology |
| `editorial-ink` | research, industry observation, culture, and narrative |
| `technical-field` | AI systems, architecture, engineering, and technical explanation |

Optional clean-room backup themes:

| ID | Best for |
|---|---|
| `guizang-magazine` | explicit electronic-magazine / electronic-ink requests |
| `guizang-swiss` | explicit guizang Swiss-international requests |

Generated themed projects include a portable `layout-manifest.json`, canonical layout contracts, tokens, layout CSS, and shared CJK rules. Read [`references/layouts.md`](./references/layouts.md) and [`references/cjk-typography.md`](./references/cjk-typography.md).

## Speaker notes and presenter mode

Store notes in `deck.json`, preferably as structured data:

```json
{
  "id": "slide-05",
  "headline": "人工终审不能被完全移除",
  "notes": {
    "speaker": "解释 AI 可以完成初筛，但品牌和业务判断仍需人工负责。",
    "durationSeconds": 75,
    "private": true
  }
}
```

`notes` may also be a legacy string. The lightweight runtime currently displays `speaker` text and an elapsed timer; `durationSeconds` remains planning metadata.

Audience controls:

| Key | Action |
|---|---|
| `P` | Open presenter window |
| `Esc` | Open or close slide overview |
| `G` | Jump to a numbered slide |
| Arrow keys / Page Up / Page Down / Space | Navigate |
| `Home` / `End` | First or last slide |

Presenter controls:

- current and next slide previews
- page number and headline
- private speaker notes
- elapsed timer and reset
- previous, next, and numbered jump
- bidirectional synchronization with the audience window
- periodic handshake so presenter refresh restores the audience position

Allow browser pop-ups when `P` is blocked.

For reliable offline notes, deliver the bundled HTML. The bundler embeds adjacent `deck.json` as `#htmlPptManifest`; some browsers block `deck.json` fetches from an unbundled `file://` page.

`private: true` hides notes from the audience canvas but does not encrypt them. Do not distribute confidential notes inside a shared HTML file.

Read [`references/presenter-mode.md`](./references/presenter-mode.md).

## Validate the production chain

Dependency-free validation:

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

Skip source validation only for topic-only projects.

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

The bundler embeds local CSS, JavaScript, images, SVG, fonts, audio, video, icons, CSS `url()` assets, and adjacent `deck.json`. It does not embed the original source or unused standardized assets.

Optional PDF export:

```bash
node scripts/export-pdf.mjs /absolute/path/to/dist/presentation.html [output.pdf]
```

Presenter and overview UI are excluded from print/PDF output.

## Automated tests

```bash
npm run test:core
npm run test:browser
npm run test:presenter
npm run tasks:validate
npm run tasks:run
npm run tasks:qa
npm run ci
```

Browser coverage includes fixed-stage behavior, navigation, presenter mode, refresh reconnection, editing, edited-HTML download isolation, and semantic visual QA. Task regression covers 10 representative jobs and 52 slides.

Read [`references/testing.md`](./references/testing.md) and [`references/task-regression.md`](./references/task-regression.md).

## Editing controls

- `E`: toggle edit mode
- Click editable text: edit in place
- Click an editable image: replace it locally
- `Ctrl/Cmd+S`: download edited HTML
- `Esc`: exit active text editing or edit mode; outside edit mode, open slide overview

Edited downloads remove generated presenter and overview clones while retaining the embedded manifest so notes continue to work.

## Scope

The editor is intentionally constrained to content edits and image replacement. Free-form dragging, arbitrary resizing, layers, cloud sync, comments, permissions, multiplayer editing, phone remotes, laser pointers, audience interaction, and analytics are not included.
