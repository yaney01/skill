import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const themeIds = ['swiss-grid', 'editorial-ink', 'technical-field'];
const themesRoot = path.join(pptRoot, 'assets', 'themes');

test('all production themes expose complete metadata, CSS, and six-slide previews', () => {
  for (const themeId of themeIds) {
    const directory = path.join(themesRoot, themeId);
    const required = ['theme.json', 'tokens.css', 'layouts.css', 'preview.html'];
    for (const file of required) {
      assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId}/${file} is missing`);
    }

    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'theme.json'), 'utf8'));
    assert.equal(metadata.id, themeId);
    assert.deepEqual(metadata.layouts, ['cover', 'section', 'statement', 'split', 'grid', 'closing']);

    const html = fs.readFileSync(path.join(directory, 'preview.html'), 'utf8');
    assert.equal((html.match(/<section\b[^>]*class="[^"]*\bslide\b/gi) || []).length, 6);
    for (const layout of metadata.layouts) assert.match(html, new RegExp(`data-layout="${layout}"`));
    assert.match(html, /data-role="deck-title"/);
  }
});

test('all theme previews pass the structural validator', () => {
  for (const themeId of themeIds) {
    const preview = path.join(themesRoot, themeId, 'preview.html');
    const result = runNode(['scripts/validate-deck.mjs', preview]);
    assert.equal(result.status, 0, `${themeId} preview failed:\n${combinedOutput(result)}`);
    assert.match(combinedOutput(result), /Slides: 6/);
  }
});

test('the generator lists installed production themes', () => {
  const result = runNode(['scripts/create-deck.mjs', '--list-themes']);
  assert.equal(result.status, 0, combinedOutput(result));
  for (const themeId of themeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t`, 'm'));
});

test('the generator creates independent, valid projects for every theme', () => {
  for (const themeId of themeIds) {
    const directory = temporaryDirectory(`html-ppt-${themeId}-`);
    const result = runNode([
      'scripts/create-deck.mjs',
      '--name', `${themeId}-deck`,
      '--title', `自动测试 ${themeId}`,
      '--theme', themeId,
      '--output', directory,
    ]);
    assert.equal(result.status, 0, `${themeId} generation failed:\n${combinedOutput(result)}`);

    const expected = [
      'index.html', 'deck.json', 'README.md',
      'runtime/viewport-base.css', 'runtime/deck-runtime.js', 'runtime/deck-editor.js',
      'theme/theme.json', 'theme/tokens.css', 'theme/layouts.css',
    ];
    for (const file of expected) assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId} generated file missing: ${file}`);

    const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'deck.json'), 'utf8'));
    assert.equal(metadata.style, themeId);
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`data-deck-id="${themeId}-deck"`));
    assert.match(html, /href="theme\/tokens\.css"/);
    assert.match(html, /自动测试/);

    const validation = runNode(['scripts/validate-deck.mjs', path.join(directory, 'index.html')]);
    assert.equal(validation.status, 0, `${themeId} generated deck failed validation:\n${combinedOutput(validation)}`);
  }
});

test('the generator rejects unknown theme IDs without writing a project', () => {
  const directory = path.join(temporaryDirectory('html-ppt-unknown-theme-'), 'deck');
  const result = runNode([
    'scripts/create-deck.mjs', '--name', 'unknown-theme', '--theme', 'does-not-exist', '--output', directory,
  ]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Unknown theme: does-not-exist/);
  assert.equal(fs.existsSync(directory), false);
});
