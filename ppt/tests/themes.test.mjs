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
const sharedContracts = path.join(themesRoot, 'shared', 'layout-contracts.json');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function previewLayouts(html) { return [...html.matchAll(/data-layout="([^"]+)"/g)].map((match) => match[1]); }

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

test('all themes expose metadata, CSS, registered layouts, shared contracts, and six-slide previews', () => {
  assert.equal(fs.existsSync(sharedContracts), true, 'shared/layout-contracts.json is missing');
  const contracts = JSON.parse(read(sharedContracts)).layouts;
  for (const themeId of themeIds) {
    const directory = path.join(themesRoot, themeId);
    const required = ['theme.json', 'layout-manifest.json', 'tokens.css', 'layouts.css', 'preview.html'];
    for (const file of required) assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId}/${file} is missing`);

    const metadata = JSON.parse(read(path.join(directory, 'theme.json')));
    const registry = JSON.parse(read(path.join(directory, 'layout-manifest.json')));
    assert.equal(metadata.id, themeId);
    assert.equal(registry.theme, themeId);
    assert.deepEqual(metadata.layouts, registry.layouts.map((layout) => layout.id));
    assert.equal(registry.layouts.length >= (backupThemeIds.includes(themeId) ? 6 : 12), true);
    for (const layout of registry.layouts) assert.ok(contracts[layout.id], `${themeId} has unknown contract ${layout.id}`);
    if (backupThemeIds.includes(themeId)) {
      assert.equal(metadata.tier, 'backup');
      assert.match(metadata.provenance, /Clean-room/);
    } else assert.equal(metadata.tier, 'core');

    const tokens = read(path.join(directory, 'tokens.css'));
    assert.match(tokens, /--theme-cjk-display:/);
    assert.match(tokens, /--theme-cjk-body:/);
    assert.match(tokens, /--theme-cjk-meta:/);

    const html = read(path.join(directory, 'preview.html'));
    assert.equal((html.match(/<section\b[^>]*class="[^"]*\bslide\b/gi) || []).length, 6);
    const allowed = new Set([...metadata.layouts, ...Object.keys(registry.legacyAliases || {})]);
    for (const layout of previewLayouts(html)) assert.ok(allowed.has(layout), `${themeId} preview uses unregistered layout ${layout}`);
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

test('the generator lists core and backup themes with registered layout counts', () => {
  const result = runNode(['scripts/create-deck.mjs', '--list-themes']);
  assert.equal(result.status, 0, combinedOutput(result));
  for (const themeId of themeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t`, 'm'));
  for (const themeId of backupThemeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t[^\\n]*\\tbackup\\t6 layouts\\t`, 'm'));
  for (const themeId of coreThemeIds) assert.match(result.stdout, new RegExp(`^${themeId}\\t[^\\n]*\\tcore\\t14 layouts\\t`, 'm'));
});

test('the generator creates independent projects with CJK and layout registry files for every theme', () => {
  for (const themeId of themeIds) {
    const directory = temporaryDirectory(`html-ppt-${themeId}-`);
    const result = runNode(['scripts/create-deck.mjs', '--name', `${themeId}-deck`, '--title', `自动测试 ${themeId}`, '--theme', themeId, '--output', directory]);
    assert.equal(result.status, 0, `${themeId} generation failed:\n${combinedOutput(result)}`);

    const expected = [
      'index.html', 'deck.json', 'README.md',
      'runtime/viewport-base.css', 'runtime/deck-runtime.js', 'runtime/deck-editor.js',
      'theme/theme.json', 'theme/tokens.css', 'theme/layouts.css', 'theme/cjk.css',
      'theme/layout-manifest.json', 'theme/layout-contracts.json',
    ];
    for (const file of expected) assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId} generated file missing: ${file}`);

    const metadata = JSON.parse(read(path.join(directory, 'deck.json')));
    assert.equal(metadata.style, themeId);
    assert.equal(metadata.themeTier, backupThemeIds.includes(themeId) ? 'backup' : 'core');
    assert.equal(metadata.layoutRegistry, 'theme/layout-manifest.json');
    assert.ok(metadata.slides.some((slide) => slide.layout === 'three-up'));
    assert.ok(!metadata.slides.some((slide) => slide.layout === 'grid'));
    const portableRegistry = JSON.parse(read(path.join(directory, 'theme', 'layout-manifest.json')));
    assert.equal(portableRegistry.contracts, 'layout-contracts.json');

    const html = read(path.join(directory, 'index.html'));
    assert.match(html, new RegExp(`data-deck-id="${themeId}-deck"`));
    assert.match(html, /data-layout="three-up"/);
    assert.doesNotMatch(html, /data-layout="grid"/);
    assert.match(html, /href="theme\/tokens\.css"/);
    assert.match(html, /href="theme\/layouts\.css"/);
    assert.match(html, /href="theme\/cjk\.css"/);
    assert.match(html, /自动测试/);

    const validation = runNode(['scripts/validate-deck.mjs', path.join(directory, 'index.html')]);
    assert.equal(validation.status, 0, `${themeId} generated deck failed validation:\n${combinedOutput(validation)}`);
    const manifestValidation = runNode(['scripts/validate-manifest.mjs', path.join(directory, 'deck.json'), '--html', path.join(directory, 'index.html')]);
    assert.equal(manifestValidation.status, 0, `${themeId} manifest failed:\n${combinedOutput(manifestValidation)}`);
  }
});

test('the generator rejects unknown theme IDs without writing a project', () => {
  const directory = path.join(temporaryDirectory('html-ppt-unknown-theme-'), 'deck');
  const result = runNode(['scripts/create-deck.mjs', '--name', 'unknown-theme', '--theme', 'does-not-exist', '--output', directory]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Unknown theme: does-not-exist/);
  assert.equal(fs.existsSync(directory), false);
});
