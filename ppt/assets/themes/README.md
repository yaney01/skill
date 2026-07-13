# HTML PPT themes

Each theme is a production template, not a color preset. A theme contains:

- `theme.json` — machine-readable identity and intended use
- `tokens.css` — palette, typography, spacing, and surface tokens
- `layouts.css` — six implemented layout families
- `preview.html` — a six-slide editable deck using real theme markup

Included themes:

| ID | Direction | Best for |
|---|---|---|
| `swiss-grid` | precise, objective, asymmetric | product, data, design, technology |
| `editorial-ink` | warm, narrative, premium | research, culture, industry analysis |
| `technical-field` | dark, engineered, diagram-led | AI systems, architecture, engineering |

Create a themed project:

```bash
node scripts/create-deck.mjs \
  --name launch-review \
  --title "产品发布复盘" \
  --theme swiss-grid \
  --output ./projects/launch-review
```

List installed themes:

```bash
node scripts/create-deck.mjs --list-themes
```

Generated projects copy the selected theme into `theme/` so they remain editable and independent of the Skill installation. Final delivery still uses `bundle-html.mjs` to inline all local CSS and runtime files.
