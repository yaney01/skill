# HTML PPT Agent Skill

A cross-agent skill for creating editable, fixed-stage HTML presentations.

- **Primary environment:** Codex
- **Compatible environment:** Claude Code
- **Output:** browser-editable HTML, not native PowerPoint
- **Runtime:** zero dependencies
- **Optional QA/export:** Node.js 20+ and Playwright
- **Collaboration:** intentionally out of scope; there is no account system, backend, database, or real-time multi-user editing

## Capabilities

- Generate decks from topics, notes, documents, images, or existing presentations
- Three-direction visual style discovery
- Fixed 1920×1080 slide canvas scaled to any screen
- Keyboard, wheel, swipe, and hash navigation
- Browser text editing and image replacement
- Local autosave and edited-HTML download
- Static validation, rendered QA screenshots, and PDF export
- Chinese and mixed CJK typography rules
- Reusable layout and image-slot contracts

## Install for Codex

Clone this repository, then symlink the skill into the user skill directory:

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

## Optional QA dependencies

```bash
cd skill/ppt
npm install
```

Then run:

```bash
node scripts/validate-deck.mjs path/to/deck.html
node scripts/qa-deck.mjs path/to/deck.html --screenshots path/to/qa
node scripts/export-pdf.mjs path/to/deck.html output.pdf
```

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
