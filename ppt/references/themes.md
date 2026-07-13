# Production themes

The production themes under `assets/themes/` are executable starting systems. They contain real tokens, layout CSS, and editable six-slide previews. Use them when the selected visual direction matches the deck; adapt content and imagery rather than treating the preview copy as a template to preserve.

## Installed themes

### `swiss-grid`

Use for product reviews, data stories, systems, design, and technology.

- strict asymmetric grid
- grotesk display type with mono metadata
- off-white surface, black structure, one functional accent
- hard rules, indices, and rectangular modules
- avoid soft cards, decorative gradients, and excessive rounding

### `editorial-ink`

Use for research synthesis, industry observation, culture, and premium narrative.

- serif display with neutral sans body
- warm paper, ink, muted secondary tone, restrained red accent
- columns, captions, pull quotes, hairlines, and folios
- image and text carry different parts of the argument
- avoid fake paper noise and ornamental overload

### `technical-field`

Use for AI systems, architecture, engineering, and technical explainers.

- dark engineered field with luminous but restrained accents
- modern sans plus mono labels
- topology, nodes, states, coordinates, and measured grid lines
- diagrams must preserve readable hierarchy
- avoid hacker clichés, dense code walls, and uncontrolled neon

## Create a themed project

```bash
node scripts/create-deck.mjs \
  --name system-review \
  --title "系统架构复盘" \
  --theme technical-field \
  --output ./projects/system-review
```

The generator copies:

```text
project/
├── index.html
├── theme/
│   ├── theme.json
│   ├── tokens.css
│   └── layouts.css
├── runtime/
├── images/
├── deck.json
└── README.md
```

The project is independent after generation. Modify the copied theme CSS inside the project rather than editing the installed Skill for one-off deck changes.

## Layout contract

Every production theme implements these six baseline layouts:

| Layout | Purpose |
|---|---|
| `cover` | establish title, position, and visual thesis |
| `section` | reset attention and introduce a chapter |
| `statement` | isolate one key claim |
| `split` | pair explanation with a visual or diagram |
| `grid` | compare parallel ideas, evidence, or metrics |
| `closing` | synthesize the decision or next action |

Additional layouts may reuse the theme's tokens and visual grammar. Do not force every content type into the six preview structures.

## Preview and QA

Open a preview directly:

```text
assets/themes/<theme-id>/preview.html
```

Validate all themes:

```bash
npm run themes:validate
```

Render all theme screenshots after installing Playwright:

```bash
npm run themes:qa
```

A production theme is not complete unless its preview validates, renders without overflow, supports browser editing, and bundles into a portable HTML document.
