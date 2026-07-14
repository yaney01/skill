# Production themes

The themes under `assets/themes/` are executable starting systems. They contain real tokens, layout CSS, shared Chinese typography, and editable six-slide previews. Adapt content and imagery rather than preserving preview copy.

## Theme tiers

- **Core** — normal production choices. Prefer these when they fit the audience and content.
- **Backup** — optional clean-room visual directions that require explicit selection. They preserve a named composition language without copying source templates, scripts, or media. Do not select them automatically over a suitable core theme.

List installed themes and their tier:

```bash
node scripts/create-deck.mjs --list-themes
```

## Core themes

### `swiss-grid`

Use for product reviews, data stories, systems, design, and technology.

- strict asymmetric grid
- grotesk display type with mono metadata
- off-white surface, black structure, one functional accent
- hard rules, indices, and rectangular modules
- Chinese uses Noto / Source Han Sans before system fallbacks
- avoid soft cards, decorative gradients, and excessive rounding

### `editorial-ink`

Use for research synthesis, industry observation, culture, and premium narrative.

- Chinese serif display with neutral Chinese sans body
- warm paper, ink, muted secondary tone, restrained red accent
- columns, captions, pull quotes, hairlines, and folios
- image and text carry different parts of the argument
- avoid fake paper noise and ornamental overload

### `technical-field`

Use for AI systems, architecture, engineering, and technical explainers.

- dark engineered field with luminous but restrained accents
- modern Chinese sans plus mono labels
- topology, nodes, states, coordinates, and measured grid lines
- diagrams must preserve readable hierarchy
- avoid hacker clichés, dense code walls, and uncontrolled neon

## Backup themes

### `guizang-magazine`

Use only when the user explicitly asks for the electronic-magazine / electronic-ink direction associated with guizang.

- dark/light editorial rhythm
- large Chinese serif titles and Chinese sans body
- mono chrome, folios, pull-quote pacing, and abstract contour atmosphere
- best for Chinese talks, industry observation, commercial storytelling, and personal sharing
- clean-room implementation; no AGPL template, script, or asset is copied

### `guizang-swiss`

Use only when the user explicitly asks for guizang's Swiss-international direction.

- extreme type contrast and rigid information hierarchy
- IKB blue with lemon and signal-orange functional accents
- dot grid, hard modules, indices, and diagram blocks
- best for Chinese product, data, design, and engineering sharing
- clean-room implementation; no AGPL template, script, or asset is copied

### `cobalt-executive-deck`

Use when the user explicitly wants the Cobalt Executive Deck / 钴蓝商策 composition.

- split executive cover with a product-device object and vertical brand block
- cool grey and white business canvases with controlled cobalt-blue emphasis
- dedicated contents rail, product modules, KPI boards, comparison panels, and roadmap grids
- best for business reports, company profiles, product portfolios, and partnership proposals
- visual reference inspected at `XshuiAi/Pretty-HTML-PPT`; clean-room implementation with no source script, media, or template copied

### `coral-startup-deck`

Use when the user explicitly wants the Coral Startup Deck / 珊瑚企简 composition.

- coral-to-orange identity fields, pale peach paper, and soft abstract shapes
- oversized translucent chapter numbers and tilted ivory information cards
- stepped funnel, startup metrics, warm comparison cards, and implementation timelines
- best for startup introductions, team roadshows, project reports, and launch plans
- visual reference inspected at `XshuiAi/Pretty-HTML-PPT`; clean-room implementation with no source script, media, or template copied

### `ribbon-tab-brochure`

Use when the user explicitly wants the Ribbon Tab Brochure / 彩签页报 composition.

- persistent colored ribbon tabs and strong black brochure frames
- pastel section pages, index rails, map-like diagrams, plan cards, and comparison sheets
- information behaves like a project brochure rather than a generic card deck
- best for service packages, project brochures, operations reviews, and external proposals
- visual reference inspected at `XshuiAi/Pretty-HTML-PPT`; clean-room implementation with no source script, media, or template copied

### `blue-growth-deck`

Use when the user explicitly wants the Blue Growth Deck / 蓝色增长稿 composition.

- full-width sky-blue top and bottom bars with deep-navy type
- lime and blush accent fields, floating bubbles, phone-like UI objects, and rounded growth cards
- dedicated product, interaction, metric, and growth-chart compositions
- best for AI products, growth reviews, GEO recaps, and friendly business presentations
- visual reference inspected at `XshuiAi/Pretty-HTML-PPT`; clean-room implementation with no source script, media, or template copied

## Shared Chinese typography

Every theme preview loads:

```text
assets/themes/shared/cjk.css
```

Every generated themed project receives:

```text
theme/cjk.css
```

The shared layer implements:

- `Noto Serif SC` / `Source Han Serif SC` display stack
- `Noto Sans SC` / `Source Han Sans SC` body stack
- separate display, body, and metadata roles
- Chinese display tracking of approximately `-0.005em`, instead of aggressive Latin negative tracking
- Chinese body tracking of approximately `0.01em`
- display line-height near `1.04`, title line-height near `1.12`, body line-height near `1.65`
- `line-break: strict`, `word-break: normal`, and normal mixed-script auto spacing
- punctuation containment and start-edge trimming where the browser supports it
- `.cjk-nowrap`, `[data-nowrap]`, and `.keep-unit` utilities for fragile phrases, model names, dates, numerals, and units

CSS cannot fully guarantee good Chinese copy fitting. Screenshot QA must still check semantic title breaks, orphan characters, punctuation placement, and Chinese/Latin spacing.

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
│   ├── layouts.css
│   └── cjk.css
├── runtime/
├── images/
├── deck.json
└── README.md
```

The project is independent after generation. Modify the copied theme CSS inside the project rather than editing the installed Skill for one-off deck changes.

## Layout contract

Every theme implements these six baseline layouts:

| Layout | Purpose |
|---|---|
| `cover` | establish title, position, and visual thesis |
| `section` | reset attention and introduce a chapter |
| `statement` | isolate one key claim |
| `split` | pair explanation with a visual or diagram |
| `three-up` | compare three parallel ideas, evidence items, or metrics |
| `closing` | synthesize the decision or next action |

Production themes may implement the complete 14-layout registry. A canonical layout ID defines the content contract, not a shared DOM composition: each theme must express the layout through its own selectors, grid, components, and visual grammar.

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

A theme is not complete unless its preview validates, renders without overflow, supports browser editing, generates an independent project with `cjk.css`, and bundles into a portable HTML document.
