# HTML PPT themes

Each theme is a production template, not a color preset. Every theme contains:

- `theme.json` — machine-readable identity, tier, intended use, and provenance
- `tokens.css` — palette, typography, spacing, and surface tokens
- `layouts.css` — six implemented layout families
- `preview.html` — a six-slide editable deck using real theme markup

All themes also load `shared/cjk.css`, which implements the common Chinese typography layer:

- Noto / Source Han serif and sans font stacks with local fallbacks
- separate Chinese display, body, and metadata roles
- restrained Chinese title tracking instead of Latin-style aggressive negative tracking
- strict CJK line breaking and normal word breaking
- Chinese body line-height and spacing defaults
- punctuation containment, mixed-language spacing support, no-wrap phrases, and number-unit binding

## Core themes

| ID | Direction | Best for |
|---|---|---|
| `swiss-grid` | precise, objective, asymmetric | product, data, design, technology |
| `editorial-ink` | warm, narrative, premium | research, culture, industry analysis |
| `technical-field` | dark, engineered, diagram-led | AI systems, architecture, engineering |

## Backup themes

| ID | Direction | Best for |
|---|---|---|
| `guizang-magazine` | electronic magazine × electronic ink | Chinese talks, industry observation, commercial storytelling |
| `guizang-swiss` | Swiss internationalism with functional color | Chinese product, data, design, and engineering sharing |

The backup themes are clean-room implementations inspired by the public design principles of `guizang-ppt-skill`. No AGPL source template, script, or asset is copied. They remain optional and are not selected automatically over the core themes.

Create a themed project:

```bash
node scripts/create-deck.mjs \
  --name launch-review \
  --title "产品发布复盘" \
  --theme swiss-grid \
  --output ./projects/launch-review
```

Create a backup-theme project explicitly:

```bash
node scripts/create-deck.mjs \
  --name industry-notes \
  --title "行业观察" \
  --theme guizang-magazine \
  --output ./projects/industry-notes
```

List installed themes and their tier:

```bash
node scripts/create-deck.mjs --list-themes
```

Generated projects copy `theme.json`, `tokens.css`, `layouts.css`, and `cjk.css` into `theme/`, so they remain editable and independent of the Skill installation. Final delivery still uses `bundle-html.mjs` to inline all local CSS and runtime files.
