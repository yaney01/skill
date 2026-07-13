# CJK typography

Apply these rules to Chinese, Japanese, Korean, and mixed-language decks, with Chinese as the primary reference.

## Recommended minimum sizes at 1920×1080

| Role | Speaker-led | Reading-first |
|---|---:|---:|
| Cover title | 108–172 px | 92–144 px |
| Section title | 84–132 px | 72–112 px |
| Slide headline | 54–84 px | 46–72 px |
| Subheadline | 34–48 px | 30–42 px |
| Body | 28–38 px | 24–34 px |
| Caption / source | 20–26 px | 18–24 px |
| Metric | 96–220 px | 80–180 px |

Treat these as default floors, not reasons to force too much content onto one slide. Small source text may be necessary, but it must remain readable in the intended delivery mode.

## Font stacks

Prefer explicitly loaded CJK families with local fallbacks:

```css
--font-display: "Noto Serif SC", "Source Han Serif SC", serif;
--font-body: "Noto Sans SC", "Source Han Sans SC", sans-serif;
```

For local/offline resilience, include broad generic fallbacks after the preferred fonts. Do not rely on a single remote font for basic layout integrity.

## Line breaking

- Do not leave opening punctuation at line ends or closing punctuation at line starts.
- Avoid isolated one-character final lines in titles and short paragraphs.
- Break titles by meaning, not merely by available width.
- Keep numerals and their units together when possible: `42%`, `3.2 倍`, `2026 年`.
- Keep product names, model names, and Latin abbreviations intact.
- Use `<span class="nowrap">...</span>` for fragile units or phrases.

Suggested CSS:

```css
.cjk-text {
  line-break: strict;
  word-break: normal;
  overflow-wrap: break-word;
  text-autospace: normal;
}
.nowrap { white-space: nowrap; }
```

## Spacing and punctuation

- Use full-width Chinese punctuation in Chinese prose.
- Do not insert spaces around Chinese punctuation.
- Add deliberate spacing between Chinese and Latin/numeral runs when it improves readability; keep it consistent.
- Avoid excessive letter spacing in body Chinese. Large display text may use subtle tracking.
- Use true ellipsis `……` in Chinese prose when appropriate, not repeated periods.

## Weight ladder

Use a clear ladder rather than relying only on size:

- display: 700–900
- slide headline: 650–800
- body emphasis: 600–700
- body: 400–500
- metadata: 400–500

Confirm that the selected web font actually provides the requested weights. Synthetic heavy weights often look muddy on projection.

## Mixed-language hierarchy

- Align Chinese and Latin baselines visually, not mechanically.
- Latin display type may use a separate family, but it must not dominate Chinese content unintentionally.
- Avoid switching families for every acronym or number.
- Use tabular numerals for KPI columns and comparison tables.

## Editorial checks

Before delivery, inspect screenshots for:

- awkward title wraps
- orphan characters
- punctuation hanging outside containers
- inconsistent Chinese/Latin spacing
- body text that appears too dense despite passing numeric font-size rules
- over-bold CJK paragraphs
- mismatched glyph styles caused by fallback fonts
