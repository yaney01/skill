# Phase four production theme verification

Verified on GitHub Actions against pull request merge state on 2026-07-13.

## Delivered themes

Core themes:

- `swiss-grid`
- `editorial-ink`
- `technical-field`

Optional clean-room backup themes:

- `guizang-magazine`
- `guizang-swiss`

Each theme contains metadata, design tokens, layout CSS, shared CJK typography, and a six-slide editable preview implementing:

- cover
- section
- statement
- split
- grid
- closing

## Chinese typography implementation

Every preview loads `assets/themes/shared/cjk.css`. Every generated themed project receives the same rules as `theme/cjk.css`.

The verified contract includes:

- Noto / Source Han Chinese serif and sans stacks with local fallbacks
- separate Chinese display, body, and metadata roles
- Chinese display tracking near `-0.005em`
- Chinese body tracking near `0.01em`
- display, title, and body line-height rules
- `line-break: strict` and `word-break: normal`
- mixed-script auto spacing and punctuation containment where supported
- `.cjk-nowrap`, `[data-nowrap]`, and `.keep-unit` utilities

## Automated result

- complete existing regression suite: passed
- shared CJK rule assertions: passed
- core theme and backup theme tests: passed
- browser runtime and editor tests: passed
- theme preview structural validation: 5 of 5 passed
- rendered theme screenshot QA: 30 of 30 slides completed without errors
- theme preview single-file bundling: 5 of 5 passed
- bundled theme structural validation: 5 of 5 passed
- generated themed projects: all five themes created and validated
- generated projects contained `theme/cjk.css`: 5 of 5 passed
- backup tier and clean-room provenance checks: passed
- unknown theme rejection: passed

## Quality adjustments

The earlier rendered run identified decorative metadata below the 20px warning threshold. Folios, mastheads, status labels, topology nodes, and terminal labels were raised to a minimum 20px.

A later review identified that the Chinese typography rules were documented but not fully connected to theme output. This was corrected by adding the shared CJK stylesheet, theme-specific Chinese font tokens, Chinese tracking and line-height overrides, strict line-breaking rules, punctuation behavior, and generator integration.

## Portability and licensing boundary

The generator copies `theme.json`, `tokens.css`, `layouts.css`, and `cjk.css` into each generated project. Bundling embeds those local styles together with the canonical runtime into one portable HTML document.

The two guizang backup themes are independent clean-room implementations based on public visual and typography descriptions. No AGPL template, JavaScript, WebGL shader, or asset is copied.

The temporary repository-level workflow used for verification was removed after this record was produced. Permanent phase-four files remain inside `ppt/`.
