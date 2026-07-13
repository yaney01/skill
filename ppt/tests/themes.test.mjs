import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const coreThemeIds = ['swiss-grid', 'editorial-ink', 'technical-field'];
const backupThemeIds = ['guizang-magazine', 'guizang-swiss'];
const themeIds = [...coreThemeIds, ...backupThemeIds];
const themesRoot = path.join(pptRoot, 'assets', 'themes');
const sharedCjk = path.join(themesRoot, 'shared', 'cjk.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('the shared CJK layer encodes Chinese fonts, spacing, line breaking, and punctuation behavior', () => {
  assert.equal(fs.existsSync(sharedCjk), true, 'shared/cjk.css is missing');
  const css = read(sharedCjk);
  assert.match(css, /Noto Serif SC/);
  assert.match(css, /Noto Sans SC/);
  assert.match(css, /line-break:\s*strict/);
  assert.match(css, /word-break:\s*normal/);
  assert.match(css, /text-autospace:\s*normal/);
  assert.match(css, /text-spacing-trim:\s*trim-start/);
  assert.match(css, /hanging-punctuation:\s*none/);
  assert.match(css, /letter-spacing:\s*-0\.005em/);
  assert.match(css, /letter-spacing:\s*0\.01em/);
  assert.match(css, /line-height:\s*1\.65/);
  assert.match(css, /\.cjk-nowrap/);
  assert.match(css, /\.keep-unit/);
});

test('all themes expose complete metadata, CSS, shared CJK rules, and six-slide previews', () => {
  for (const themeId of themeIds) {
    const directory = path.join(themesRoot, themeId);
    const required = ['theme.json', 'tokens.css', 'layouts.css', 'preview.html'];
    for (const file of required) {
      assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId}/${file} is missing`);
    }

    const metadata = JSON.parse(read(path.join(directory, 'theme.json')));
    assert.equal(metadata.id, themeId);
    assert.deepEqual(metadata.layouts, ['cover', 'section', 'statement', 'split', 'grid', 'closing']);
    if (backupThemeIds.includes(themeId)) {
      assert.equal(metadata.tier, 'backup');
      assert.match(metadata.provenance, /Clean-room/);
    }

    const tokens = read(path.join(directory, 'tokens.css'));
    assert.match(tokens, /--theme-cjk-display:/);
    assert.match(tokens, /--theme-cjk-body:/);
    assert.match(tokens, /--theme-cjk-meta:/);

    const html = read(path.join(directory, 'preview.html'));
    assert.equal((html.match(/<section\b[^>]*class="[^"]*\bslide\b/gi) || []).length, 6);
    for (const layout of metadata.layouts) assert.match(html, new RegExp(`data-layout="${layout}"`));
    assert.match(html, /data-role="deck-title"/);
    assert.match(html, /href="\.\.\/shared\/cjk\.css"/);
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

test('the generator lists core and backup themes', () => {
  const result = runNode(['scripts/create-deck.mjs', '--list-themes']);
  assert.equal(result.status, 0, combinedOutput(result));
  for (const themeId of themeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t`, 'm'));
  for (const themeId of backupThemeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t[^\\n]*\\tbackup\\t`, 'm'));
});

test('the generator creates independent, valid projects with CJK CSS for every theme', () => {
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
      'theme/theme.json', 'theme/tokens.css', 'theme/layouts.css', 'theme/cjk.css',
    ];
    for (const file of expected) assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId} generated file missing: ${file}`);

    const metadata = JSON.parse(read(path.join(directory, 'deck.json')));
    assert.equal(metadata.style, themeId);
    assert.equal(metadata.themeTier, backupThemeIds.includes(themeId) ? 'backup' : null);
    const html = read(path.join(directory, 'index.html'));
    assert.match(html, new RegExp(`data-deck-id="${themeId}-deck"`));
    assert.match(html, /href="theme\/tokens\.css"/);
    assert.match(html, /href="theme\/layouts\.css"/);
    assert.match(html, /href="theme\/cjk\.css"/);
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
