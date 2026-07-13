#!/usr/bin/env node
import fs from 'node:fs';

function read(fileUrl) {
  return fs.readFileSync(fileUrl, 'utf8');
}

function write(fileUrl, source) {
  fs.writeFileSync(fileUrl, source, 'utf8');
}

function insertBefore(fileUrl, marker, block, sentinel, label) {
  let source = read(fileUrl);
  if (source.includes(sentinel)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`${label}: marker not found: ${marker}`);
  source = `${source.slice(0, index)}${block}\n\n${source.slice(index)}`;
  write(fileUrl, source);
  console.log(`${label}: applied`);
  return true;
}

function insertAfter(fileUrl, marker, block, sentinel, label) {
  let source = read(fileUrl);
  if (source.includes(sentinel)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`${label}: marker not found: ${marker}`);
  const end = index + marker.length;
  source = `${source.slice(0, end)}\n\n${block}${source.slice(end)}`;
  write(fileUrl, source);
  console.log(`${label}: applied`);
  return true;
}

function replaceOnce(fileUrl, before, after, label) {
  let source = read(fileUrl);
  if (source.includes(after)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
  write(fileUrl, source);
  console.log(`${label}: applied`);
  return true;
}

let changed = false;
const planning = new URL('../references/visual-planning.md', import.meta.url);
const workflow = new URL('../references/workflow.md', import.meta.url);
const skill = new URL('../SKILL.md', import.meta.url);
const readme = new URL('../README.md', import.meta.url);
const createDeck = new URL('./create-deck.mjs', import.meta.url);

changed = insertAfter(
  planning,
  'Create or update `deck.json` before authoring the full deck. Use `schemas/deck.schema.json` as the contract.',
  [
    '<!-- phase-eleven-visual-production -->',
    'Then generate `qa/visual-work-orders.json` and `qa/visual-work-orders.md`. The work orders convert each visual decision into an executable production task and keep planning separate from delivery readiness.',
    '',
    'Read [`visual-production.md`](visual-production.md) for the build, validate, synchronize, and delivery contract.',
  ].join('\n'),
  '<!-- phase-eleven-visual-production -->',
  'visual planning integration',
) || changed;

changed = insertBefore(
  workflow,
  '## 7. Style discovery',
  [
    '## 6.1 Visual production work orders',
    '',
    '<!-- phase-eleven-workflow -->',
    'After the per-slide visual decisions are stable, generate an executable work order for every slide:',
    '',
    '```bash',
    'node scripts/validate-manifest.mjs project/deck.json --stage planning',
    'node scripts/build-visual-work-orders.mjs project/deck.json \\',
    '  --output project/qa/visual-work-orders.json \\',
    '  --markdown project/qa/visual-work-orders.md \\',
    '  --stage planning \\',
    '  --force',
    'node scripts/validate-visual-work-orders.mjs \\',
    '  project/qa/visual-work-orders.json \\',
    '  --deck project/deck.json \\',
    '  --stage planning',
    '```',
    '',
    'Use the work orders to generate images, capture screenshots, review supplied assets, and build precise HTML/SVG/chart visuals. When production is complete, synchronize approved paths, alt text, focus, prompts, and statuses into `deck.json`:',
    '',
    '```bash',
    'node scripts/sync-visual-work-orders.mjs \\',
    '  project/qa/visual-work-orders.json \\',
    '  --deck project/deck.json \\',
    '  --stage delivery \\',
    '  --write',
    '```',
    '',
    'Final delivery requires both manifest and work-order validation in `delivery` mode. Planning mode may report incomplete required visuals as warnings; delivery mode blocks them.',
    '',
    'Read [`visual-production.md`](visual-production.md).',
  ].join('\n'),
  '<!-- phase-eleven-workflow -->',
  'workflow integration',
) || changed;

changed = replaceOnce(
  workflow,
  'node scripts/validate-manifest.mjs project/deck.json --html project/index.html\nnode scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots',
  'node scripts/validate-manifest.mjs project/deck.json --html project/index.html --stage delivery --strict\nnode scripts/validate-visual-work-orders.mjs project/qa/visual-work-orders.json --deck project/deck.json --stage delivery --strict\nnode scripts/qa-deck.mjs project/index.html --screenshots project/qa/screenshots',
  'workflow delivery commands',
) || changed;

changed = replaceOnce(
  skill,
  '- A deck is not complete merely because structural and screenshot QA pass. It must also satisfy the production manifest and semantic visual QA.',
  '- A deck is not complete merely because structural and screenshot QA pass. It must also satisfy the production manifest, synchronized visual work orders, and semantic visual QA.',
  'Skill output contract',
) || changed;

changed = insertBefore(
  skill,
  '### 9. Generate the deck',
  [
    '### 8.1 Execute and synchronize visual work orders',
    '',
    '<!-- phase-eleven-skill -->',
    'Every generated project includes `qa/visual-work-orders.json` and `qa/visual-work-orders.md`. Regenerate them after changing slide purpose, layout, visual type, source, role, or slot:',
    '',
    '```bash',
    'node scripts/build-visual-work-orders.mjs project/deck.json \\',
    '  --output project/qa/visual-work-orders.json \\',
    '  --markdown project/qa/visual-work-orders.md \\',
    '  --stage planning \\',
    '  --force',
    '```',
    '',
    'Complete the work orders using the available environment. Generated images, screenshots, supplied files, HTML/SVG diagrams, charts, and intentional typography all remain valid production routes.',
    '',
    'Synchronize completed work before delivery validation:',
    '',
    '```bash',
    'node scripts/sync-visual-work-orders.mjs \\',
    '  project/qa/visual-work-orders.json \\',
    '  --deck project/deck.json \\',
    '  --stage delivery \\',
    '  --write',
    '```',
    '',
    'Read [`references/visual-production.md`](references/visual-production.md).',
  ].join('\n'),
  '<!-- phase-eleven-skill -->',
  'Skill production workflow',
) || changed;

changed = replaceOnce(
  skill,
  'node scripts/validate-manifest.mjs \\\n  /absolute/path/to/project/deck.json \\\n  --html /absolute/path/to/project/index.html \\\n  --strict',
  'node scripts/validate-manifest.mjs \\\n  /absolute/path/to/project/deck.json \\\n  --html /absolute/path/to/project/index.html \\\n  --stage delivery \\\n  --strict\n\nnode scripts/validate-visual-work-orders.mjs \\\n  /absolute/path/to/project/qa/visual-work-orders.json \\\n  --deck /absolute/path/to/project/deck.json \\\n  --stage delivery \\\n  --strict',
  'Skill delivery validation',
) || changed;

changed = replaceOnce(
  skill,
  '| `references/visual-planning.md` | Per-slide visual decisions and coverage targets |\n| `references/image-prompts.md` | Generated image contracts and exclusions |',
  '| `references/visual-planning.md` | Per-slide visual decisions and coverage targets |\n| `references/visual-production.md` | Work-order generation, fulfillment, synchronization, and delivery checks |\n| `schemas/visual-work-orders.schema.json` | Visual production work-order contract |\n| `references/image-prompts.md` | Generated image contracts and exclusions |',
  'Skill resource guide',
) || changed;

changed = insertBefore(
  readme,
  '## Validate the production chain',
  [
    '## Visual production work orders',
    '',
    '<!-- phase-eleven-readme -->',
    'New projects automatically include:',
    '',
    '```text',
    'qa/',
    '├── visual-work-orders.json',
    '└── visual-work-orders.md',
    '```',
    '',
    'Use planning mode while producing assets and delivery mode before bundling:',
    '',
    '```bash',
    'node scripts/build-visual-work-orders.mjs project/deck.json \\',
    '  --output project/qa/visual-work-orders.json \\',
    '  --markdown project/qa/visual-work-orders.md \\',
    '  --stage planning \\',
    '  --force',
    '',
    'node scripts/sync-visual-work-orders.mjs project/qa/visual-work-orders.json \\',
    '  --deck project/deck.json \\',
    '  --stage delivery \\',
    '  --write',
    '',
    'node scripts/validate-visual-work-orders.mjs project/qa/visual-work-orders.json \\',
    '  --deck project/deck.json \\',
    '  --stage delivery \\',
    '  --strict',
    '```',
    '',
    'Delivery validation checks required status, local path containment, file existence, image ratio, alt text, generated prompts, and synchronization with `deck.json`.',
    '',
    'See [`references/visual-production.md`](./references/visual-production.md).',
  ].join('\n'),
  '<!-- phase-eleven-readme -->',
  'README production workflow',
) || changed;

changed = replaceOnce(
  readme,
  '- Maintain an auditable source-page-to-final-slide mapping\n- Fixed 1920×1080 slide canvas scaled to any screen',
  '- Maintain an auditable source-page-to-final-slide mapping\n- Generate per-slide visual production work orders in JSON and Markdown\n- Validate planning and delivery states, including local paths, image ratios, alt text, and deck synchronization\n- Fixed 1920×1080 slide canvas scaled to any screen',
  'README capabilities',
) || changed;

changed = replaceOnce(
  createDeck,
  '- `deck.json` — source mapping, registered layouts, slide map, and visual plan',
  '- `deck.json` — source mapping, registered layouts, slide map, and synchronized visual plan\n- `qa/visual-work-orders.json` — executable per-slide visual production queue\n- `qa/visual-work-orders.md` — human-readable production handoff',
  'generated README file list',
) || changed;

changed = replaceOnce(
  createDeck,
  '${next + 1}. Create or frame required assets.\n${next + 2}. Run source, layout, structural, rendered, and visual QA.',
  '${next + 1}. Review and fulfill `qa/visual-work-orders.json` and `qa/visual-work-orders.md`.\n${next + 2}. Synchronize completed work orders into `deck.json`.\n${next + 3}. Run source, layout, structural, delivery-manifest, work-order, rendered, and visual QA.',
  'generated README production order',
) || changed;

changed = replaceOnce(
  createDeck,
  'node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --strict\nnode scripts/qa-deck.mjs',
  'node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --stage delivery --strict\nnode scripts/validate-visual-work-orders.mjs /absolute/path/to/${deckId}/qa/visual-work-orders.json --deck /absolute/path/to/${deckId}/deck.json --stage delivery --strict\nnode scripts/qa-deck.mjs',
  'generated README delivery commands',
) || changed;

if (!changed) console.log('No phase-eleven documentation changes required.');
