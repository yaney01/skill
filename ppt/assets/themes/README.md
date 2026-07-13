# HTML PPT themes

Each theme is a production template, not a color preset. Every theme contains:

- `theme.json` — machine-readable identity, tier, intended use, and registered layout IDs
- `layout-manifest.json` — executable layout support, selectors, aliases, and contract reference
- `tokens.css` — palette, typography, spacing, and surface tokens
- `layouts.css` — actual CSS implementation for every registered selector
- `preview.html` — a six-slide editable design preview

All themes also load:

- `shared/cjk.css` — common Chinese typography rules
- `shared/layout-contracts.json` — canonical layout purposes, variants, slots, capacities, and visual policies

The preview is not the complete layout library. Use the layout manifest or generated layout catalog to inspect production coverage.

## Core themes

| ID | Direction | Best for | Registered layouts |
|---|---|---|---:|
| `swiss-grid` | precise, objective, asymmetric | product, data, design, technology | 14 |
| `editorial-ink` | warm, narrative, premium | research, culture, industry analysis | 14 |
| `technical-field` | dark, engineered, diagram-led | AI systems, architecture, engineering | 14 |

Core themes implement:

```text
cover
section
statement
split
image-focus
three-up
four-grid
metrics
comparison
timeline
process
chart
quote
closing
```

## Backup themes

| ID | Direction | Best for | Registered layouts |
|---|---|---|---:|
| `guizang-magazine` | electronic magazine × electronic ink | Chinese talks, industry observation, commercial storytelling | 6 |
| `guizang-swiss` | Swiss internationalism with functional color | Chinese product, data, design, and engineering sharing | 6 |

The backup themes are clean-room implementations inspired by the public design principles of `guizang-ppt-skill`. No AGPL source template, script, or asset is copied. They remain optional and are not selected automatically over the core themes.

## Validate registries

```bash
node scripts/validate-layouts.mjs --strict
node scripts/validate-layouts.mjs --theme swiss-grid --strict
```

The validator checks:

- theme and manifest identity
- tier-specific minimum layout count
- canonical contract existence
- duplicate IDs and invalid aliases
- exact agreement with `theme.json`
- CSS implementation of every selector
- preview use of registered layouts or declared aliases

## Render a complete layout catalog

```bash
node scripts/render-layout-catalog.mjs \
  --theme swiss-grid \
  --output ./qa/layout-catalogs/swiss-grid
```

The output is an independent 14-slide HTML project with its own runtime, theme files, `deck.json`, layout manifest, and canonical contracts. Run normal structural, manifest, and browser QA against it.

```bash
npm run layouts:validate
npm run layouts:catalogs
npm run layouts:qa
```

## Create a themed project

```bash
node scripts/create-deck.mjs \
  --name launch-review \
  --title "产品发布复盘" \
  --theme swiss-grid \
  --output ./projects/launch-review
```

Generated themed projects copy:

```text
theme/
├── theme.json
├── layout-manifest.json
├── layout-contracts.json
├── tokens.css
├── layouts.css
└── cjk.css
```

`deck.json.layoutRegistry` points to `theme/layout-manifest.json`. The manifest validator rejects unregistered layout IDs. The legacy `grid` name remains accepted as an alias for `three-up`, but new work should use the canonical ID.
