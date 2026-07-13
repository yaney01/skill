# Visual territories

Use these as starting territories, not immutable themes. Every deck should adapt typography, palette, imagery, and graphic devices to its subject.

Three core territories and two backup guizang directions now have executable themes. Read [`themes.md`](themes.md) and initialize the selected theme with `create-deck.mjs --theme <id>`.

## 1. Swiss Grid

- **Core theme:** `swiss-grid`
- **Backup theme:** `guizang-swiss` when the user explicitly wants the guizang Swiss-international direction
- **Tone:** precise, modern, objective
- **Typography:** large grotesk headline, neutral CJK sans, mono metadata
- **Palette:** white/black plus one functional accent such as IKB blue, safety orange, acid yellow, or signal green
- **Devices:** strict grid, rules, indices, crop marks, asymmetry
- **Best for:** technology, systems, data, design, product reviews
- **Avoid:** decorative cards, soft gradients, excessive rounded corners

## 2. Editorial Ink

- **Core theme:** `editorial-ink`
- **Backup theme:** `guizang-magazine` when the user explicitly wants electronic magazine × electronic ink
- **Tone:** thoughtful, cultural, premium
- **Typography:** CJK serif display, clean sans body, restrained italics for Latin accents
- **Palette:** warm paper, ink, muted secondary tone, one decisive accent
- **Devices:** columns, pull quotes, captions, image crops, hairlines, folio numbers
- **Best for:** industry observation, narrative, research synthesis, cultural topics
- **Avoid:** fake paper noise that reduces readability, ornamental overload

## 3. Bold Signal

- **Tone:** assertive, launch-oriented, energetic
- **Typography:** compressed or geometric display with clear body face
- **Palette:** dominant dark or bright field with a high-contrast accent
- **Devices:** oversized numbers, diagonal divisions, strong blocks, fast reveal
- **Best for:** launches, pitches, campaign ideas, high-stakes recommendations
- **Avoid:** using maximum emphasis on every slide
- **Status:** territory only; no production theme yet

## 4. Technical Field

- **Core theme:** `technical-field`
- **Tone:** rigorous, engineered, advanced
- **Typography:** modern CJK sans plus mono labels/code
- **Palette:** near-black, cool neutral, restrained luminous accent
- **Devices:** diagrams, coordinates, thin lines, terminal-like annotations, measured glow
- **Best for:** architecture, AI systems, engineering, technical explainers
- **Avoid:** illegible “hacker” styling, gratuitous neon, dense code walls

## 5. Paper Technical

- **Tone:** analytical but approachable
- **Typography:** strong sans headline, serif or neutral sans body
- **Palette:** off-white, graphite, one muted chart palette
- **Devices:** notebook rules, annotations, diagrams, evidence labels
- **Best for:** workshops, teaching, methods, product strategy
- **Avoid:** scrapbook decoration and fake handwriting unless context requires it
- **Status:** territory only; no production theme yet

## 6. Image-Led Premium

- **Tone:** visual, restrained, confident
- **Typography:** minimal display and small precise metadata
- **Palette:** derived from imagery with controlled contrast
- **Devices:** full-bleed photography, cinematic crops, subtle overlays
- **Best for:** portfolio, brand, product story, keynote
- **Avoid:** weak stock imagery, text over busy focal areas, repeated hero-image treatment
- **Status:** territory only; no production theme yet

## Chinese typography requirement

Every executable theme must load `assets/themes/shared/cjk.css`. Chinese titles must not inherit aggressive Latin negative tracking. Chinese body text must retain readable line-height, strict line breaking, punctuation containment, and stable Chinese/Latin spacing. See [`cjk-typography.md`](cjk-typography.md).

## Preview differentiation

Previews must differ in more than color. Vary:

- type system
- grid and composition
- image behavior
- background/surface model
- motion thesis
- degree of formality

Use real title-slide content. Never place internal labels such as “safe option,” “wildcard,” “backup,” or style names on the slide.

## Production selection

```bash
node scripts/create-deck.mjs \
  --name deck-name \
  --title "Presentation title" \
  --theme swiss-grid \
  --output /absolute/path/to/project
```

Use `--list-themes` to inspect the installed catalog and each theme tier. Backup themes require explicit selection. If a chosen territory has no production theme, start from the neutral template and implement a deck-specific visual system instead of pretending an unrelated theme matches.
