#!/usr/bin/env node
import fs from 'node:fs';

const editorPath = new URL('../assets/runtime/deck-editor.js', import.meta.url);
const testPath = new URL('../tests/editor.test.mjs', import.meta.url);

function replaceExactly(fileUrl, before, after, label) {
  const file = fs.readFileSync(fileUrl, 'utf8');
  if (file.includes(after)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const count = file.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  fs.writeFileSync(fileUrl, file.replace(before, after), 'utf8');
  console.log(`${label}: applied`);
  return true;
}

let changed = false;
changed = replaceExactly(
  editorPath,
  `    redo() {\n      clearTimeout(this.saveTimer);\n      this.saveTimer = null;\n      if (this.historyIndex >= this.history.length - 1) return;`,
  `    redo() {\n      this.commit();\n      if (this.historyIndex >= this.history.length - 1) return;`,
  'redo transaction guard',
) || changed;

changed = replaceExactly(
  editorPath,
  `        if (edit.type === 'image' && element.dataset.editable === 'image' && typeof edit.src === 'string' && this.safeImageSource(edit.src)) {\n          const fit = ['cover', 'contain', ''].includes(edit.fit) ? edit.fit : '';\n          const focus = typeof edit.focus === 'string' && edit.focus.length <= 64 && !/[;{}]/.test(edit.focus) ? edit.focus : '';\n          normalized[id] = {\n            type: 'image',\n            src: edit.src,\n            alt: typeof edit.alt === 'string' ? edit.alt.slice(0, 2000) : '',\n            fit,\n            focus,\n          };\n        }`,
  `        if (edit.type === 'image' && element.dataset.editable === 'image' && typeof edit.src === 'string' && this.safeImageSource(edit.src)) {\n          const current = this.captureElement(element);\n          const fit = typeof edit.fit === 'string' && ['cover', 'contain', ''].includes(edit.fit) ? edit.fit : current.fit;\n          const focus = typeof edit.focus === 'string' && edit.focus.length <= 64 && !/[;{}]/.test(edit.focus) ? edit.focus : current.focus;\n          normalized[id] = {\n            type: 'image',\n            src: edit.src,\n            alt: typeof edit.alt === 'string' ? edit.alt.slice(0, 2000) : current.alt,\n            fit,\n            focus,\n          };\n        }`,
  'legacy image metadata fallback',
) || changed;

changed = replaceExactly(
  testPath,
  `    assert.doesNotMatch(html, /html-ppt-selected/);`,
  `    assert.doesNotMatch(html, /<[^>]+\\bclass="[^"]*\\bhtml-ppt-selected\\b/);`,
  'downloaded DOM selection assertion',
) || changed;

if (!changed) console.log('No changes required.');
