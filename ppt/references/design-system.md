# Design-system rules

## Fixed canvas

Design at `1920×1080`. Scale the complete `.deck-stage` uniformly into the browser viewport.

Recommended safe areas:

- left/right: 96–144 px
- top: 72–112 px
- bottom: 88–128 px
- keep essential content away from navigation chrome outside the stage

Use a grid appropriate to the style. A reliable baseline is 12 columns with 24–32 px gutters.

## Tokens

Define the visual system through CSS custom properties:

```css
:root {
  --color-bg: #f4f0e8;
  --color-surface: #fffdf8;
  --color-text: #171717;
  --color-muted: #66645f;
  --color-accent: #e85d2a;
  --font-display: "Noto Serif SC", serif;
  --font-body: "Noto Sans SC", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
  --space-1: 12px;
  --space-2: 20px;
  --space-3: 32px;
  --space-4: 48px;
  --space-5: 72px;
  --radius: 18px;
  --shadow: 0 18px 50px rgb(0 0 0 / 0.12);
}
```

Avoid scattered literal colors and arbitrary spacing unless they represent meaningful exceptions.

## Hierarchy

Every slide needs:

1. one dominant entry point
2. a clear reading order
3. a visible relationship between headline, evidence, and conclusion
4. enough contrast to survive projection and low-quality displays

Do not distribute visual emphasis evenly across every object.

## Typography

- Use no more than two primary families plus an optional monospaced metadata face.
- Use weight, size, line height, and spacing before adding decorative effects.
- Avoid default UI typography and generic dashboard styling unless the source product itself requires it.
- Keep line lengths controlled: roughly 12–22 CJK characters for display lines and 22–38 for body lines.
- Use tabular numerals for metrics when supported.

Read `cjk-typography.md` for Chinese-specific rules.

## Surfaces and borders

Prefer one coherent surface vocabulary:

- editorial: paper, hairlines, rules, crop marks, captions
- Swiss: strict grid, flat fields, functional color, strong type scale
- technical: dark field, code/diagram lines, measured glow
- premium: restrained contrast, large imagery, minimal chrome

Avoid combining every effect—gradient, glass, glow, shadow, border, texture—on the same slide.

## Motion

Motion should clarify state and sequence.

- use one dominant entrance pattern per deck
- keep transitions fast enough for live navigation
- use stagger only when order matters
- never hide essential information indefinitely behind animation
- honor `prefers-reduced-motion`
- PDF and screenshots must show the final stable state

## Image treatment

- select a slot ratio before choosing or generating the image
- use a consistent crop policy per image class
- retain sufficient resolution for 1920×1080 presentation
- place captions and sources consistently
- do not put essential text inside generated images when editable HTML text is possible
- use masks, borders, or backgrounds to integrate screenshots without obscuring UI details

## Visual rhythm

A deck should alternate intensity:

- dense → sparse
- dark → light, when the style supports it
- text-led → image-led
- analysis → statement
- grid → full bleed

Do not repeat the same card grid for most slides. Repetition should establish a system, not reveal a generator default.
