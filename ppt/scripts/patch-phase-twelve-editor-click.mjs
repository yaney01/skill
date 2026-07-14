#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('../assets/runtime/deck-editor.js', import.meta.url);
const source = fs.readFileSync(fileUrl, 'utf8');
const before = `        this.select(editable);\n        if (editable.dataset.editable === 'image') {\n          event.preventDefault();\n          event.stopPropagation();\n        }`;
const after = `        this.select(editable);\n        event.stopPropagation();\n        if (editable.dataset.editable === 'image') {\n          event.preventDefault();\n        }`;

if (source.includes(after)) {
  console.log('Editor click isolation already applied.');
} else {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one editor click block, found ${count}.`);
  fs.writeFileSync(fileUrl, source.replace(before, after), 'utf8');
  console.log('Editor click isolation applied.');
}
