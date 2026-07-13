#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('./patch-phase-eleven-docs.mjs', import.meta.url);
let source = fs.readFileSync(fileUrl, 'utf8');
const replacements = [
  ['before: `${next}. Edit', 'before: `\${next}. Edit'],
  ['\n${next + 1}. Create or frame', '\n\${next + 1}. Create or frame'],
  ['\n${next + 2}. Run source', '\n\${next + 2}. Run source'],
  ['after: `${next}. Edit', 'after: `\${next}. Edit'],
  ['\n${next + 1}. Regenerate', '\n\${next + 1}. Regenerate'],
  ['\n${next + 2}. Create, capture', '\n\${next + 2}. Create, capture'],
  ['\n${next + 3}. Synchronize', '\n\${next + 3}. Synchronize'],
  ['\n${next + 4}. Run source', '\n\${next + 4}. Run source'],
  ['/absolute/path/to/${deckId}/deck.json', '/absolute/path/to/\${deckId}/deck.json'],
  ['/absolute/path/to/${deckId}/index.html', '/absolute/path/to/\${deckId}/index.html'],
  ['/absolute/path/to/${deckId}/qa/visual-work-orders.json', '/absolute/path/to/\${deckId}/qa/visual-work-orders.json'],
];
let changed = false;
for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Expected docs patch fragment not found: ${before}`);
  source = source.replaceAll(before, after);
  changed = true;
}
if (changed) fs.writeFileSync(fileUrl, source, 'utf8');
console.log(changed ? 'Escaped phase-eleven documentation placeholders.' : 'Documentation placeholders already escaped.');
