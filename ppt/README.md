# HTML PPT Agent Skill

A cross-agent skill for creating editable, fixed-stage HTML presentations.

- **Primary environment:** Codex
- **Compatible environment:** Claude Code
- **Output:** browser-editable HTML, not native PowerPoint
- **Runtime:** zero dependencies
- **Tooling:** Node.js 20+; Playwright is required for rendered QA, PDF export, and browser interaction tests
- **Collaboration:** intentionally out of scope; there is no account system, backend, database, or real-time multi-user editing

## Capabilities

- Generate decks from topics, notes, documents, images, or existing presentations
- Initialize a maintainable development project with one command
- Fixed 1920×1080 slide canvas scaled to any screen
- Keyboard, wheel, swipe, and hash navigation
- Browser text editing and image replacement
- Local autosave and edited-HTML download
- Bundle runtime files and local media into one portable HTML file
- Static validation, rendered QA screenshots, and PDF export
- Automated structural, bundling, runtime, editor, theme, and CJK regression tests
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

## Create a neutral deck project

```bash
cd skill/ppt
node scripts/create-deck.mjs \
  --name ai-trends \
  --title "AI 广告生产的新工作流" \
  --lang zh-CN \
  --output /absolute/path/to/projects/ai-trends
```

The command refuses to write into a non-empty output directory unless `--force` is supplied. `--force` overwrites only generated files and does not delete unrelated files.

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

Generated themed structure:

```text
industry-review/
├── index.html
├── deck.json
├── README.md
├── images/
├── runtime/
│   ├── viewport-base.css
│   ├── deck-runtime.js
│   └── deck-editor.js
└── theme/
    ├── theme.json
    ├── tokens.css
    ├── layouts.css
    └── cjk.css
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

See [`references/cjk-typography.md`](./references/cjk-typography.md) for the complete contract.

## Validate and bundle

```bash
node scripts/validate-deck.mjs /absolute/path/to/ai-trends/index.html
node scripts/bundle-html.mjs \
  /absolute/path/to/ai-trends/index.html \
  /absolute/path/to/dist/ai-trends.html
node scripts/validate-deck.mjs /absolute/path/to/dist/ai-trends.html
```

`bundle-html.mjs` embeds:

- local stylesheets, including theme and CJK CSS
- local JavaScript
- local images and SVG files
- local fonts referenced through CSS `url()`
- local audio and video sources
- icons and preload assets

Remote URLs are not downloaded. They remain in the output and are reported, so external web fonts can still require a network connection. Core playback and editing remain local.

## Rendered QA and PDF export

Install optional dependencies:

```bash
cd skill/ppt
npm install
npx playwright install chromium
```

Then run:

```bash
node scripts/qa-deck.mjs path/to/deck.html --screenshots path/to/qa
node scripts/export-pdf.mjs path/to/deck.html output.pdf
```

Validate and render every installed theme:

```bash
npm run themes:validate
npm run themes:qa
```

## Real-world regression example

The example deck at [`examples/ai-ad-workflow`](./examples/ai-ad-workflow/) contains 12 Chinese slides and two local SVG assets. It covers cover, statement, section, data hero, comparison, image split, three-column, evidence grid, process, quote, timeline, and closing layouts.

Run the dependency-free regression path:

```bash
npm run example:validate
npm run example:bundle
node scripts/validate-deck.mjs examples/ai-ad-workflow/dist/ai-ad-workflow.html
```

Run rendered browser QA after installing Playwright:

```bash
npm run example:qa
```

The committed QA record confirms 12 rendered slides, zero overflow or out-of-bounds errors, zero broken images, zero console errors, working Arrow Right navigation, and working `E` edit-mode activation. Generated bundles and PNG screenshots are ignored and can be recreated locally.

## Automated tests

Core tests do not require a browser:

```bash
npm run test:core
```

Core coverage includes:

- validating the real Chinese example
- rejecting duplicate editable IDs
- rejecting missing local assets
- rejecting multiple initially active slides
- embedding runtime files and SVG assets into one HTML document
- validating bundled output
- refusing destructive in-place bundling
- validating all core and backup themes
- confirming the CJK font, tracking, line-height, line-breaking, punctuation, and no-wrap contracts
- generating independent projects containing `theme/cjk.css`

Install Playwright and Chromium before running interaction tests:

```bash
npm install
npx playwright install chromium
npm run test:browser
```

Browser coverage includes:

- fixed 1920×1080 stage behavior
- exactly one active slide
- keyboard, hash, and wheel navigation
- whole-stage mobile scaling without reflow
- edit-mode activation and exit
- text autosave and reload restoration
- image replacement with embedded Data URLs
- downloading an edited self-contained HTML file

Run the complete regression pipeline:

```bash
npm run ci
```

The `ci` command remains self-contained inside `ppt/`; repository-level workflow configuration is intentionally not required.

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
