# Workflow and content architecture

## 1. Source intake

Prefer authoritative source material supplied by the user. For each source, extract:

- claims and supporting evidence
- dates, names, numbers, units, and definitions
- required quotations or screenshots
- content that may be condensed versus content that must remain verbatim
- uncertainty, conflicts, or missing context

Do not treat a visual reference as factual evidence. Do not invent citations to make a slide look complete.

## 2. Brief resolution

A complete brief contains:

| Dimension | Examples |
|---|---|
| Purpose | persuade, teach, report, launch, review |
| Audience | executives, customers, technical team, general public |
| Delivery | live talk, async reading, portfolio, web publication |
| Length | slide count or speaking duration |
| Density | speaker-led or reading-first |
| Tone | authoritative, editorial, technical, premium, playful |
| Assets | logos, photos, screenshots, data, existing deck |
| Constraints | brand rules, mandatory sections, language, prohibited content |

Ask only for missing dimensions that materially change the deck.

## 3. Narrative map

Use a slide map before writing detailed HTML. Every slide must have one primary job.

Recommended arc:

1. **Hook** — a contradiction, question, outcome, or decisive number
2. **Context** — what changed and why the audience should care
3. **Thesis** — the main claim or decision
4. **Evidence** — examples, data, demonstrations, comparison
5. **Shift** — implication, tradeoff, or new operating model
6. **Action** — recommendation, next steps, or decision request
7. **Close** — memorable synthesis, not a generic “Thank you” page

A report may repeat evidence sections; a tutorial may replace thesis/evidence with progressive steps.

## 4. Density modes

### Speaker-led

- one idea per slide
- 1–3 bullets or one short paragraph
- larger type and more negative space
- more slides are preferable to shrinking content
- visuals should carry part of the explanation

### Reading-first

- slides are independently understandable
- 4–8 concise bullets, 3–6 cards, or a structured table may be acceptable
- use annotations, labels, sources, and explicit conclusions
- maintain strong hierarchy; do not paste a document onto the canvas

## 5. Slide-map format

Use a compact planning table:

| # | Purpose | Headline | Evidence/visual | Layout | Notes |
|---|---|---|---|---|---|
| 01 | Hook | ... | ... | cover | ... |

Headlines should communicate the slide conclusion whenever possible. Avoid repetitive labels such as “Background,” “Problem,” and “Solution” unless the deck format requires them.

## 6. Style discovery

If direction is open, generate three title-slide previews using real title/subtitle/company/date content:

- **Restrained:** safest for the audience and stakes
- **Expressive:** stronger typography, color, and visual device
- **Wildcard:** directly derived from the subject matter

The previews must be viable systems, not decorative one-offs. Each must imply how content, data, section, quote, and closing slides will work.

## 7. Generation sequence

Generate in this order:

1. theme tokens
2. global grid and safe areas
3. cover and section layouts
4. representative content layouts
5. remaining slides
6. navigation and editor
7. validation and screenshots
8. targeted fixes
9. final export

Do not spend time polishing every detail before one complete representative pass exists.

## 8. Conversion rules

When converting an existing deck or document:

- preserve meaning, slide order, and required assets unless the user approves restructuring
- record omissions and consolidations
- retain speaker notes as HTML comments when they are available
- avoid tracing low-quality screenshots when the underlying text/data can be rebuilt semantically
- preserve screenshots pixel-faithfully when they are evidence or product UI

## 9. Redesign rules

When redesigning an existing HTML deck:

- identify the established runtime before modifying it
- create a content inventory and density assessment
- preserve stable IDs and working behavior
- change tokens and reusable classes before applying one-off patches
- split crowded slides instead of compressing typography
- validate the whole deck after shared CSS or runtime changes
