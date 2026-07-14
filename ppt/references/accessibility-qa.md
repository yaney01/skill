# Accessibility QA

Accessibility QA is a release gate for structural and interactive defects. It supplements, but does not replace, human review with assistive technology and projected-display testing.

## Command

```bash
node scripts/qa-accessibility.mjs project/index.html \
  --browser chromium \
  --json project/qa/accessibility-report.json
```

Use `--browser webkit` for Safari-compatible verification. Use `--strict` only when warnings have been reviewed and the project intentionally treats them as blocking.

## Blocking findings

The automated audit reports errors for:

- missing document language;
- missing document title;
- missing deck stage;
- duplicate DOM IDs;
- missing or duplicate slide IDs;
- invalid active-slide and `aria-hidden` state;
- images without an `alt` attribute;
- visible controls without an accessible name;
- `aria-controls` references to missing elements;
- browser runtime errors during the audit.

Use `alt=""` for decorative images. Meaningful images require concise alternative text that communicates their purpose, not their visual style alone.

## Review warnings

The audit reports warnings for:

- slides without semantic headings;
- approximate text contrast below WCAG thresholds.

Contrast detection is intentionally conservative. Gradients, images, transparency, overlays, and projection conditions require manual review.

## Manual checks

Before delivery, confirm:

1. keyboard navigation from first to last slide;
2. visible focus for playback, overview, presenter, and editor controls;
3. no keyboard trap while editing text;
4. meaningful reading order within each slide;
5. speaker notes do not appear in the audience view;
6. reduced-motion mode removes nonessential animation;
7. text and charts remain distinguishable without relying on color alone;
8. the final bundled HTML works with browser zoom and system contrast settings;
9. WebKit behavior matches Chromium for essential playback and editing;
10. accessibility reports are retained with auditable deliveries when required.

## Scope

This audit does not claim full WCAG certification. It does not test screen-reader pronunciation, cognitive accessibility, caption quality, language correctness within mixed-language passages, or the factual usefulness of alternative text.
