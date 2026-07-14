import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const themesRoot = path.join(pptRoot, 'assets', 'themes');
const sharedCjk = path.join(themesRoot, 'shared', 'cjk.css');
const sharedContracts = path.join(themesRoot, 'shared', 'layout-contracts.json');
const requiredCompositionThemes = [
  'cobalt-executive-deck',
  'coral-startup-deck',
  'ribbon-tab-brochure',
  'blue-growth-deck',
];
const compositionPrefixes = new Map([
  ['cobalt-executive-deck', '.cobalt-'],
  ['coral-startup-deck', '.coral-'],
  ['ribbon-tab-brochure', '.ribbon-'],
  ['blue-growth-deck', '.growth-'],
]);

function read(file) { return fs.readFileSync(file, 'utf8'); }
function readJson(file) { return JSON.parse(read(file)); }
function previewLayouts(html) { return [...html.matchAll(/data-layout="([^"]+)"/g)].map((match) => match[1]); }
function previewSections(html) { return [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/gi)].map((match) => match[0]); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function installedThemeIds() {
  return fs.readdirSync(themesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared' && fs.existsSync(path.join(themesRoot, entry.name, 'theme.json')))
    .map((entry) => entry.name)
    .sort();
}

const themeIds = installedThemeIds();
const themeMetadata = new Map(themeIds.map((themeId) => [themeId, readJson(path.join(themesRoot, themeId, 'theme.json'))]));

for (const themeId of requiredCompositionThemes) {
  assert.ok(themeIds.includes(themeId), `Required composition theme is not installed: ${themeId}`);
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

test('all installed themes expose metadata, CSS, registered layouts, shared contracts, and six-slide previews', () => {
  assert.equal(fs.existsSync(sharedContracts), true, 'shared/layout-contracts.json is missing');
  const contracts = readJson(sharedContracts).layouts;
  for (const themeId of themeIds) {
    const directory = path.join(themesRoot, themeId);
    const required = ['theme.json', 'layout-manifest.json', 'tokens.css', 'layouts.css', 'preview.html'];
    for (const file of required) assert.equal(fs.existsSync(path.join(directory, file)), true, `${themeId}/${file} is missing`);

    const metadata = themeMetadata.get(themeId);
    const registry = readJson(path.join(directory, 'layout-manifest.json'));
    assert.equal(metadata.id, themeId);
    assert.equal(registry.theme, themeId);
    assert.deepEqual(metadata.layouts, registry.layouts.map((layout) => layout.id));
    assert.equal(registry.layouts.length >= (metadata.tier === 'backup' ? 6 : 12), true);
    for (const layout of registry.layouts) assert.ok(contracts[layout.id], `${themeId} has unknown contract ${layout.id}`);
    if (metadata.tier === 'backup') assert.match(metadata.provenance, /Clean-room/);
    else assert.equal(metadata.tier, 'core');

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

    const compositionPrefix = compositionPrefixes.get(themeId);
    if (compositionPrefix) {
      assert.equal(registry.layouts.length, 14, `${themeId} must implement the full 14-layout production contract`);
      assert.ok(registry.layouts.every((layout) => layout.selector.startsWith(compositionPrefix)), `${themeId} reuses a foreign composition selector`);
      assert.ok(html.includes(`class="${compositionPrefix.slice(1)}`), `${themeId} preview does not use its composition prefix`);
      assert.doesNotMatch(html, /class="[^"]*\btheme-(?:cover|section|statement|split|grid|closing)\b/);
    }
  }
});

test('composition previews label illustrative metrics and avoid misleading placeholders', () => {
  for (const themeId of requiredCompositionThemes) {
    const html = read(path.join(themesRoot, themeId, 'preview.html'));
    assert.doesNotMatch(html, /\bSHUI\b|visual clarity|workflow ready/i, `${themeId} retains a source-specific or misleading placeholder`);

    for (const section of previewSections(html)) {
      const hasIllustrativeClaim = /(?:>\s*[+−-]?\d+(?:\.\d+)?(?:%|×)\s*<)|--(?:fill|value):\s*\d+%/i.test(section);
      if (!hasIllustrativeClaim) continue;
      assert.match(section, /data-example-data="true"/, `${themeId} contains an unlabeled illustrative metric`);
      assert.match(section, /示例|SAMPLE|DEMO/i, `${themeId} example metrics lack a visible disclosure`);
    }
  }

  const coral = read(path.join(themesRoot, 'coral-startup-deck', 'preview.html'));
  assert.doesNotMatch(coral, /PLAN\s*\/\s*90 DAYS/i, 'Coral timeline claims 90 days while showing only 12 weeks');

  const ribbon = read(path.join(themesRoot, 'ribbon-tab-brochure', 'preview.html'));
  assert.match(ribbon, /data-layout="three-up"[\s\S]*class="ribbon-three-up"/i);
  assert.match(ribbon, /三种核心信息/);
});

test('all theme previews pass the structural validator', () => {
  for (const themeId of themeIds) {
    const preview = path.join(themesRoot, themeId, 'preview.html');
    const result = runNode(['scripts/validate-deck.mjs', preview]);
    assert.equal(result.status, 0, `${themeId} preview failed:\n${combinedOutput(result)}`);
    assert.match(combinedOutput(result), /Slides: 6/);
  }
});

test('the generator lists every installed theme with its tier and registered layout count', () => {
  const result = runNode(['scripts/create-deck.mjs', '--list-themes']);
  assert.equal(result.status, 0, combinedOutput(result));
  for (const themeId of themeIds) {
    const metadata = themeMetadata.get(themeId);
    const expected = new RegExp(`^${escapeRegExp(themeId)}\\t[^\\n]*\\t${metadata.tier}\\t${metadata.layouts.length} layouts\\t`, 'm');
    assert.match(result.stdout, expected);
  }
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

    const installedMetadata = themeMetadata.get(themeId);
    const metadata = readJson(path.join(directory, 'deck.json'));
    assert.equal(metadata.style, themeId);
    assert.equal(metadata.themeTier, installedMetadata.tier);
    assert.equal(metadata.layoutRegistry, 'theme/layout-manifest.json');
    assert.equal(metadata.slides.length, 6);
    assert.ok(metadata.slides.every((slide) => installedMetadata.layouts.includes(slide.layout)), `${themeId} generated an unregistered slide layout`);
    assert.ok(!metadata.slides.some((slide) => slide.layout === 'grid'));
    const portableRegistry = readJson(path.join(directory, 'theme', 'layout-manifest.json'));
    assert.equal(portableRegistry.contracts, 'layout-contracts.json');

    const html = read(path.join(directory, 'index.html'));
    assert.match(html, new RegExp(`data-deck-id="${escapeRegExp(themeId)}-deck"`));
    assert.match(html, /data-layout="[^"]+"/);
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
