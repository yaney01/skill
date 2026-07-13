# HTML PPT Agent Skill

A cross-agent skill for creating editable, fixed-stage HTML presentations.

- **Primary environment:** Codex
- **Compatible environment:** Claude Code
- **Output:** browser-editable HTML, not native PowerPoint
- **Runtime:** zero dependencies
- **Tooling:** Node.js 20+; Playwright is required only for rendered QA and PDF export
- **Collaboration:** intentionally out of scope; there is no account system, backend, database, or real-time multi-user editing

## Capabilities

- Generate decks from topics, notes, documents, images, or existing presentations
- Initialize a maintainable development project with one command
- Three-direction visual style discovery
- Fixed 1920×1080 slide canvas scaled to any screen
- Keyboard, wheel, swipe, and hash navigation
- Browser text editing and image replacement
- Local autosave and edited-HTML download
- Bundle runtime files and local media into one portable HTML file
- Static validation, rendered QA screenshots, and PDF export
- Chinese and mixed CJK typography rules
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

## Create a deck project

The development project keeps runtime code separate so there is one canonical source for playback and editing behavior.

```bash
cd skill/ppt
node scripts/create-deck.mjs \
  --name ai-trends \
  --title "AI 广告生产的新工作流" \
  --lang zh-CN \
  --output /absolute/path/to/projects/ai-trends
```

Generated structure:

```text
ai-trends/
├── index.html
├── deck.json
├── README.md
├── images/
└── runtime/
    ├── viewport-base.css
    ├── deck-runtime.js
    └── deck-editor.js
```

The command refuses to write into a non-empty output directory unless `--force` is supplied. `--force` overwrites only generated files and does not delete unrelated files.

## Validate and bundle

```bash
node scripts/validate-deck.mjs /absolute/path/to/ai-trends/index.html
node scripts/bundle-html.mjs \
  /absolute/path/to/ai-trends/index.html \
  /absolute/path/to/dist/ai-trends.html
node scripts/validate-deck.mjs /absolute/path/to/dist/ai-trends.html
```

`bundle-html.mjs` embeds:

- local stylesheets
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
