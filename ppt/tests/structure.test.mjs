import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, exampleHtml, runNode, temporaryDirectory } from './helpers.mjs';

function validate(file) {
  return runNode(['scripts/validate-deck.mjs', file]);
}

test('the real Chinese example passes structural validation', () => {
  const result = validate(exampleHtml);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, /Slides:\s*12/);
  assert.match(result.stdout, /Validation passed/);
});

test('the validator rejects duplicate data-element-id values', () => {
  const source = fs.readFileSync(exampleHtml, 'utf8');
  const ids = [...source.matchAll(/data-element-id="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length > 1, 'example must contain at least two editable element IDs');

  const directory = temporaryDirectory('html-ppt-duplicate-id-');
  const invalid = path.join(directory, 'invalid.html');
  fs.writeFileSync(invalid, source.replace(`data-element-id="${ids[1]}"`, `data-element-id="${ids[0]}"`));

  const result = validate(invalid);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Duplicate data-element-id values/);
});

test('the validator rejects missing local media', () => {
  const source = fs.readFileSync(exampleHtml, 'utf8');
  const directory = temporaryDirectory('html-ppt-missing-asset-');
  const invalid = path.join(directory, 'invalid.html');
  const rewritten = source.replace('images/workflow-map.svg', 'images/does-not-exist.svg');
  fs.writeFileSync(invalid, rewritten);

  const result = validate(invalid);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Local asset not found/);
});

test('the validator rejects more than one initially active slide', () => {
  const source = fs.readFileSync(exampleHtml, 'utf8');
  const directory = temporaryDirectory('html-ppt-active-slide-');
  const invalid = path.join(directory, 'invalid.html');
  const rewritten = source.replace('class="slide dark"', 'class="slide active dark"');
  fs.writeFileSync(invalid, rewritten);

  const result = validate(invalid);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Expected exactly one initially active slide/);
});
