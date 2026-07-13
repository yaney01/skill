#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('../tests/editor.test.mjs', import.meta.url);
const source = fs.readFileSync(fileUrl, 'utf8');
const before = `    assert.doesNotMatch(html, /data-presenter-overview/);`;
const after = `    assert.doesNotMatch(html, /<[^>]+\\bdata-presenter-overview(?:\\s|=|>)/);`;
if (source.includes(after)) {
  console.log('Overview DOM assertion already applied.');
} else {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one overview assertion, found ${count}`);
  fs.writeFileSync(fileUrl, source.replace(before, after), 'utf8');
  console.log('Overview DOM assertion applied.');
}
