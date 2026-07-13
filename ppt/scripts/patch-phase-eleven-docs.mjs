#!/usr/bin/env node
import fs from 'node:fs';

function patchFile(fileUrl, operations) {
  let source = fs.readFileSync(fileUrl, 'utf8');
  let changed = false;
  for (const operation of operations) {
    if (source.includes(operation.after)) {
      console.log(`${operation.label}: already applied`);
      continue;
    }
    if (!source.includes(operation.before)) {
      console.log(`${operation.label}: source text not found; skipped`);
      continue;
    }
    source = source.replace(operation.before, operation.after);
    changed = true;
    console.log(`${operation.label}: applied`);
  }
  if (changed) fs.writeFileSync(fileUrl, source, 'utf8');
  return changed;
}

let changed = false;

changed = patchFile(new URL('../references/visual-planning.md', import.meta.url), [
  {
    label: 'visual planning work-order contract',
    before: 'Create or update `deck.json` before authoring the full deck. Use `schemas/deck.schema.json` as the contract.',
    after: 'Create or update `deck.json` before authoring the full deck. Use `schemas/deck.schema.json` as the narrative and visual-decision contract. Then generate `qa/visual-work-orders.json` and `qa/visual-work-orders.md` using [`visual-production.md`](visual-production.md).',
  },
  {
    label: 'visual planning sequence',
    before: `1. Identify audience, purpose, duration, density, and delivery environment.
2. Inspect all supplied images and screenshots before finalizing the outline.
3. Assign each slide a purpose, headline, layout, and visual decision.
4. Check visual distribution across the whole deck.
5. Confirm slot ratios before generating or framing assets.
6. Generate or build visuals.
7. Mark each required visual \`ready\` only after the actual file or DOM visual exists.
8. Run manifest validation, mechanical QA, visual QA, and contact-sheet review.`,
    after: `1. Identify audience, purpose, duration, density, and delivery environment.
2. Inspect all supplied images and screenshots before finalizing the outline.
3. Assign each slide a purpose, headline, layout, and visual decision in \`deck.json\`.
4. Run planning-stage manifest validation.
5. Generate the visual work orders and review the whole sequence.
6. Confirm slot ratios before generating or framing assets.
7. Generate images, capture screenshots, review supplied assets, or build DOM visuals.
8. Synchronize completed work orders back to \`deck.json\`.
9. Mark each required visual \`ready\` only after the actual file or DOM visual exists.
10. Run delivery-stage manifest and work-order validation, then mechanical QA, visual QA, and contact-sheet review.`,
  },
  {
    label: 'visual planning completion',
    before: `- required assets have status \`ready\`
- visual and evidence coverage targets are met or deliberately revised`,
    after: `- every slide has a visual work order
- required assets have status \`ready\`
- work-order values are synchronized into \`deck.json\`
- delivery-stage work-order validation passes
- visual and evidence coverage targets are met or deliberately revised`,
  },
]) || changed;

changed = patchFile(new URL('../references/workflow.md', import.meta.url), [
  {
    label: 'workflow visual plan commands',
    before: '`targetCoverage` includes deliberate typographic and statement pages. `targetEvidenceCoverage` only counts images, screenshots, charts, diagrams, timelines, comparisons, and semantic HTML visualizations.\n\nRead [`visual-planning.md`](visual-planning.md) before authoring the full HTML.',
    after: `\`targetCoverage\` includes deliberate typographic and statement pages. \`targetEvidenceCoverage\` only counts images, screenshots, charts, diagrams, timelines, comparisons, and semantic HTML visualizations.

Validate the plan and generate executable work orders:

\`\`\`bash
node scripts/validate-manifest.mjs project/deck.json --stage planning
node scripts/build-visual-work-orders.mjs project/deck.json \\
  --output project/qa/visual-work-orders.json \\
  --markdown project/qa/visual-work-orders.md \\
  --stage planning \\
  --force
node scripts/validate-visual-work-orders.mjs \\
  project/qa/visual-work-orders.json \\
  --deck project/deck.json \\
  --stage planning
\`\`\`

Read [`visual-planning.md`](visual-planning.md) and [`visual-production.md`](visual-production.md) before authoring the full HTML.`,
  },
  {
    label: 'workflow asset production',
    before: `1. inventory supplied and extracted assets
2. assign slot ratios
3. frame screenshots without redrawing critical UI
4. generate only the images that carry a clear narrative role
5. build diagrams, charts, and exact labels in HTML/SVG when precision matters
6. record paths, alt text, focus, source, and status in \`deck.json\`
7. mark required assets \`ready\` only when the actual file or DOM visual exists
8. retain a provenance link back to the standardized source asset`,
    after: `1. inventory supplied and extracted assets
2. generate and review the per-slide visual work orders
3. assign or confirm slot ratios
4. frame screenshots without redrawing critical UI
5. generate only the images that carry a clear narrative role
6. build diagrams, charts, and exact labels in HTML/SVG when precision matters
7. record paths, alt text, focus, source, status, prompt, and provenance in the work orders
8. synchronize completed work orders back to \`deck.json\`
9. mark required assets \`ready\` only when the actual file or DOM visual exists
10. run delivery-stage manifest and work-order validation`,
  },
  {
    label: 'workflow asset production references',
    before: `- [\`image-prompts.md\`](image-prompts.md)
- [\`screenshot-framing.md\`](screenshot-framing.md)`,
    after: `- [\`visual-production.md\`](visual-production.md)
- [\`image-prompts.md\`](image-prompts.md)
- [\`screenshot-framing.md\`](screenshot-framing.md)`,
  },
  {
    label: 'workflow generation sequence',
    before: `1. standardized source import and validation when applicable
2. source-to-slide mapping
3. production manifest and visual plan
4. theme tokens
5. global grid and safe areas
6. cover and section layouts
7. representative content and visual layouts
8. remaining slides and assets
9. navigation and editor
10. structural and manifest validation
11. rendered mechanical QA
12. semantic visual QA and contact sheet
13. targeted fixes
14. final bundling and export`,
    after: `1. standardized source import and validation when applicable
2. source-to-slide mapping
3. production manifest and visual plan
4. planning-stage manifest validation
5. visual work-order generation
6. theme tokens
7. global grid and safe areas
8. cover and section layouts
9. representative content and visual layouts
10. visual asset and DOM production
11. work-order synchronization into \`deck.json\`
12. remaining slides and assets
13. navigation and editor
14. delivery-stage manifest and work-order validation
15. rendered mechanical QA
16. semantic visual QA and contact sheet
17. targeted fixes
18. final bundling and export`,
  },
  {
    label: 'workflow QA commands',
    before: `node scripts/validate-source.mjs project/source/manifest.json --source original.pptx --strict
node scripts/validate-deck.mjs project/index.html
node scripts/validate-manifest.mjs project/deck.json --html project/index.html
node scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots`,
    after: `node scripts/validate-source.mjs project/source/manifest.json --source original.pptx --strict
node scripts/validate-deck.mjs project/index.html
node scripts/validate-manifest.mjs project/deck.json --html project/index.html --stage delivery --strict
node scripts/validate-visual-work-orders.mjs project/qa/visual-work-orders.json --deck project/deck.json --stage delivery --strict
node scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots`,
  },
]) || changed;

changed = patchFile(new URL('../SKILL.md', import.meta.url), [
  {
    label: 'Skill output contract work orders',
    before: '- A deck is not complete merely because structural and screenshot QA pass. It must also satisfy the production manifest and semantic visual QA.',
    after: '- A deck is not complete merely because structural and screenshot QA pass. It must also satisfy the production manifest, synchronized visual work orders, and semantic visual QA.',
  },
  {
    label: 'Skill visual planning references',
    before: `- [\`schemas/deck.schema.json\`](schemas/deck.schema.json)
- [\`references/visual-planning.md\`](references/visual-planning.md)
- [\`references/layouts.md\`](references/layouts.md)`,
    after: `- [\`schemas/deck.schema.json\`](schemas/deck.schema.json)
- [\`schemas/visual-work-orders.schema.json\`](schemas/visual-work-orders.schema.json)
- [\`references/visual-planning.md\`](references/visual-planning.md)
- [\`references/visual-production.md\`](references/visual-production.md)
- [\`references/layouts.md\`](references/layouts.md)`,
  },
  {
    label: 'Skill generated structure',
    before: `├── images/
├── runtime/
└── theme/         # when a theme is selected`,
    after: `├── images/
├── qa/
│   ├── visual-work-orders.json
│   └── visual-work-orders.md
├── runtime/
└── theme/         # when a theme is selected`,
  },
  {
    label: 'Skill asset production commands',
    before: `- Add meaningful alt text.

Read:

- [\`references/image-prompts.md\`](references/image-prompts.md)`,
    after: `- Add meaningful alt text.

Generate, fulfill, and synchronize the work orders:

\`\`\`bash
node scripts/build-visual-work-orders.mjs project/deck.json \\
  --output project/qa/visual-work-orders.json \\
  --markdown project/qa/visual-work-orders.md \\
  --stage planning \\
  --force

node scripts/sync-visual-work-orders.mjs \\
  project/qa/visual-work-orders.json \\
  --deck project/deck.json \\
  --stage delivery \\
  --write
\`\`\`

Read:

- [\`references/visual-production.md\`](references/visual-production.md)
- [\`references/image-prompts.md\`](references/image-prompts.md)`,
  },
  {
    label: 'Skill manifest validation commands',
    before: `node scripts/validate-manifest.mjs \\
  /absolute/path/to/project/deck.json \\
  --html /absolute/path/to/project/index.html \\
  --strict`,
    after: `node scripts/validate-manifest.mjs \\
  /absolute/path/to/project/deck.json \\
  --html /absolute/path/to/project/index.html \\
  --stage delivery \\
  --strict

node scripts/validate-visual-work-orders.mjs \\
  /absolute/path/to/project/qa/visual-work-orders.json \\
  --deck /absolute/path/to/project/deck.json \\
  --stage delivery \\
  --strict`,
  },
  {
    label: 'Skill validation explanation',
    before: 'Skip `validate-source.mjs` only when the project has no standardized source. Do not mark a required visual `ready` before the asset or DOM visual exists.',
    after: 'Skip `validate-source.mjs` only when the project has no standardized source. During planning, use `--stage planning`; before delivery, synchronize the work orders and use `--stage delivery --strict`. Do not mark a required visual `ready` before the asset or DOM visual exists.',
  },
  {
    label: 'Skill modification rules work orders',
    before: '- update `deck.json` whenever slide purpose, layout, visual decision, or source mapping changes',
    after: '- update `deck.json` whenever slide purpose, layout, visual decision, or source mapping changes\n- regenerate visual work orders after planning changes, and synchronize completed work orders before delivery validation',
  },
  {
    label: 'Skill resource guide work orders',
    before: `| \`references/visual-planning.md\` | Per-slide visual decisions and coverage targets |
| \`references/image-prompts.md\` | Generated image contracts and exclusions |`,
    after: `| \`references/visual-planning.md\` | Per-slide visual decisions and coverage targets |
| \`references/visual-production.md\` | Visual work-order generation, fulfillment, synchronization, and delivery checks |
| \`schemas/visual-work-orders.schema.json\` | Visual production work-order contract |
| \`references/image-prompts.md\` | Generated image contracts and exclusions |`,
  },
]) || changed;

changed = patchFile(new URL('../README.md', import.meta.url), [
  {
    label: 'README capabilities',
    before: `- Maintain an auditable source-page-to-final-slide mapping
- Fixed 1920×1080 slide canvas scaled to any screen`,
    after: `- Maintain an auditable source-page-to-final-slide mapping
- Generate per-slide visual production work orders in JSON and Markdown
- Validate planning and delivery stages separately, including local paths, image ratios, alt text, and deck synchronization
- Fixed 1920×1080 slide canvas scaled to any screen`,
  },
  {
    label: 'README project structure',
    before: `├── images/
├── runtime/
└── theme/`,
    after: `├── images/
├── qa/
│   ├── visual-work-orders.json
│   └── visual-work-orders.md
├── runtime/
└── theme/`,
  },
  {
    label: 'README manifest responsibilities',
    before: `- \`source/manifest.json\` records what the original source contains and what must be preserved.
- \`deck.json\` records the final narrative, layouts, visual decisions, and source-to-slide mapping.`,
    after: `- \`source/manifest.json\` records what the original source contains and what must be preserved.
- \`deck.json\` records the final narrative, layouts, visual decisions, and source-to-slide mapping.
- \`qa/visual-work-orders.json\` records the executable per-slide visual production queue and synchronization state.`,
  },
  {
    label: 'README production validation',
    before: `node scripts/validate-deck.mjs /absolute/path/to/project/index.html

node scripts/validate-manifest.mjs \\
  /absolute/path/to/project/deck.json \\
  --html /absolute/path/to/project/index.html \\
  --strict`,
    after: `node scripts/validate-deck.mjs /absolute/path/to/project/index.html

node scripts/validate-manifest.mjs \\
  /absolute/path/to/project/deck.json \\
  --html /absolute/path/to/project/index.html \\
  --stage delivery \\
  --strict

node scripts/validate-visual-work-orders.mjs \\
  /absolute/path/to/project/qa/visual-work-orders.json \\
  --deck /absolute/path/to/project/deck.json \\
  --stage delivery \\
  --strict`,
  },
  {
    label: 'README core coverage',
    before: `- source-policy argument validation
- validating the real Chinese example`,
    after: `- source-policy argument validation
- visual work-order generation, planning/delivery lifecycle, synchronization, path containment, alt text, and image ratio checks
- generated projects containing synchronized JSON and Markdown visual work orders
- validating the real Chinese example`,
  },
]) || changed;

changed = patchFile(new URL('./create-deck.mjs', import.meta.url), [
  {
    label: 'generated README file list',
    before: `- \`images/\` — local presentation assets
- \`deck.json\` — source mapping, registered layouts, slide map, and visual plan`,
    after: `- \`images/\` — local presentation assets
- \`deck.json\` — source mapping, registered layouts, slide map, and synchronized visual plan
- \`qa/visual-work-orders.json\` — executable per-slide visual production queue
- \`qa/visual-work-orders.md\` — human-readable production handoff`,
  },
  {
    label: 'generated README production order',
    before: `${next}. Edit \`deck.json\` and assign every slide a purpose, registered layout, visual decision, and source provenance.
${next + 1}. Create or frame required assets.
${next + 2}. Run source, layout, structural, rendered, and visual QA.`,
    after: `${next}. Edit \`deck.json\` and assign every slide a purpose, registered layout, visual decision, and source provenance.
${next + 1}. Regenerate and review \`qa/visual-work-orders.json\` and \`qa/visual-work-orders.md\`.
${next + 2}. Create, capture, review, or build the required visuals.
${next + 3}. Synchronize completed work orders into \`deck.json\`.
${next + 4}. Run source, layout, structural, delivery-manifest, work-order, rendered, and visual QA.`,
  },
  {
    label: 'generated README validation commands',
    before: `node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --strict
node scripts/qa-deck.mjs`,
    after: `node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --stage delivery --strict
node scripts/validate-visual-work-orders.mjs /absolute/path/to/${deckId}/qa/visual-work-orders.json --deck /absolute/path/to/${deckId}/deck.json --stage delivery --strict
node scripts/qa-deck.mjs`,
  },
]) || changed;

if (!changed) console.log('No phase-eleven documentation changes required.');
