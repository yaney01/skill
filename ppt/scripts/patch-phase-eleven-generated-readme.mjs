#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('./create-deck.mjs', import.meta.url);
let source = fs.readFileSync(fileUrl, 'utf8');
let changed = false;

function replaceOnce(before, after, label) {
  if (source.includes(after)) {
    console.log(`${label}: already applied`);
    return;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
  changed = true;
  console.log(`${label}: applied`);
}

replaceOnce(
  '- \\`deck.json\\` — source mapping, registered layouts, slide map, and visual plan',
  '- \\`deck.json\\` — source mapping, registered layouts, slide map, and synchronized visual plan\n- \\`qa/visual-work-orders.json\\` — executable per-slide visual production queue\n- \\`qa/visual-work-orders.md\\` — human-readable production handoff',
  'generated README file list',
);

replaceOnce(
  '${next + 1}. Create or frame required assets.\n${next + 2}. Run source, layout, structural, rendered, and visual QA.',
  '${next + 1}. Review and fulfill \\`qa/visual-work-orders.json\\` and \\`qa/visual-work-orders.md\\`.\n${next + 2}. Synchronize completed work orders into \\`deck.json\\`.\n${next + 3}. Run source, layout, structural, delivery-manifest, work-order, rendered, and visual QA.',
  'generated README production order',
);

replaceOnce(
  'node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --strict\nnode scripts/qa-deck.mjs',
  'node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --stage delivery --strict\nnode scripts/validate-visual-work-orders.mjs /absolute/path/to/${deckId}/qa/visual-work-orders.json --deck /absolute/path/to/${deckId}/deck.json --stage delivery --strict\nnode scripts/qa-deck.mjs',
  'generated README delivery commands',
);

if (changed) fs.writeFileSync(fileUrl, source, 'utf8');
else console.log('No generated README changes required.');
