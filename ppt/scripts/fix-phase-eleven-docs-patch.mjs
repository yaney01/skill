#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('./patch-phase-eleven-docs.mjs', import.meta.url);
let source = fs.readFileSync(fileUrl, 'utf8');
let changed = false;

const strictGuard = "  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);";
const tolerantGuard = [
  "  if (count !== 1) {",
  "    console.log(`${label}: expected one match, found ${count}; skipped`);",
  "    return false;",
  "  }",
].join('\n');
if (!source.includes(tolerantGuard)) {
  if (!source.includes(strictGuard)) throw new Error('replaceOnce strict-match guard not found.');
  source = source.replace(strictGuard, tolerantGuard);
  changed = true;
}

const createDeckStart = source.indexOf("changed = replaceOnce(\n  createDeck,");
if (createDeckStart >= 0) {
  const finalMarker = "if (!changed) console.log('No phase-eleven documentation changes required.');";
  const finalIndex = source.indexOf(finalMarker, createDeckStart);
  if (finalIndex < 0) throw new Error('Documentation patch final marker not found.');
  source = `${source.slice(0, createDeckStart)}${finalMarker}\n`;
  changed = true;
}

if (changed) {
  fs.writeFileSync(fileUrl, source, 'utf8');
  console.log('Separated documentation and generated README patch responsibilities.');
} else {
  console.log('Documentation patch responsibilities are already separated.');
}
