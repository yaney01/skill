# Quality checklist

Resolve all P0 issues before delivery. P1 issues should be resolved unless the user explicitly accepts the tradeoff.

## P0 — blocking

- [ ] Final output opens locally without a build step.
- [ ] The deck uses one fixed 1920×1080 stage and scales uniformly.
- [ ] Exactly one slide is active during playback.
- [ ] No slide scrolls internally.
- [ ] No required text is clipped or outside the slide.
- [ ] No unintended panel, text, or image overlap appears in screenshots.
- [ ] All required images load and every image has an appropriate `alt` attribute.
- [ ] The document declares language and title metadata.
- [ ] Visible controls have accessible names and valid ARIA references.
- [ ] Exactly one active slide is exposed to assistive technology; inactive slides are `aria-hidden`.
- [ ] Navigation works with keyboard and touch/mouse input.
- [ ] Edit mode works and does not reflow the layout.
- [ ] Downloaded edited HTML reopens with the edits preserved.
- [ ] The final bundled HTML passes the Chromium and WebKit release smoke tests.
- [ ] Accessibility QA reports no blocking errors.
- [ ] Facts, numbers, dates, units, names, and citations match the source.
- [ ] There are no workflow labels, template names, placeholders, or internal notes visible in the deck.

## P1 — presentation quality

- [ ] Each slide has one primary communication job.
- [ ] Headlines express conclusions rather than generic section labels where possible.
- [ ] The deck alternates visual intensity and does not repeat one card layout mechanically.
- [ ] Text remains readable at the intended delivery distance.
- [ ] CJK title wraps and punctuation are deliberate.
- [ ] Image crops preserve the subject and required screenshot details.
- [ ] Chart labels, units, time periods, and sources are explicit.
- [ ] Color contrast is sufficient on projected and low-quality displays.
- [ ] Animations clarify sequence and support reduced-motion mode.
- [ ] The closing slide provides synthesis, action, or decision—not only “Thank you.”

## P2 — polish

- [ ] Spacing follows a visible rhythm.
- [ ] Alignment is consistent across slides.
- [ ] Decorative devices are context-specific and reused coherently.
- [ ] Font loading has a reasonable fallback.
- [ ] Captions, footnotes, and folio styles are consistent.
- [ ] Replaced images are embedded or packaged correctly for delivery.

## Mechanical validation

Run:

```bash
node scripts/validate-deck.mjs deck.html
```

This checks structure, required runtime hooks, IDs, common fixed-stage errors, and placeholder content.

## Rendered validation

Run:

```bash
node scripts/qa-deck.mjs deck.html --screenshots qa
```

Review the generated screenshots at full size. Browser geometry checks cannot determine whether hierarchy, cropping, or composition is aesthetically correct.

## Accessibility and browser validation

<!-- phase-twelve-quality -->
Run:

```bash
node scripts/qa-accessibility.mjs deck.html --browser chromium --json qa/accessibility-report.json
HTML_PPT_BROWSER=webkit npm run test:browser-smoke
HTML_PPT_BROWSER=webkit npm run test:accessibility
```

Review contrast warnings manually. Gradients, images, transparency, projection conditions, and screen-reader usefulness cannot be certified by geometry alone.


## Final smoke test

1. Open the final HTML in a fresh browser tab.
2. Navigate from first to last slide and back.
3. Enter edit mode with `E`.
4. Edit one text element and replace one image.
5. Download with `Ctrl/Cmd+S`.
6. Open the downloaded file and confirm the changes.
7. Reset the original localStorage state if the delivered default should remain clean.
