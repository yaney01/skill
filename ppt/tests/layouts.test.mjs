import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const coreThemes = ['swiss-grid', 'editorial-ink', 'technical-field'];
const themesRoot = path.join(pptRoot, 'assets', 'themes');
const allThemes = fs.readdirSync(themesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared' && fs.existsSync(path.join(themesRoot, entry.name, 'layout-manifest.json')))
  .map((entry) => entry.name)
  .sort();

test('all installed layout registries pass strict validation', () => {
  const result = runNode(['scripts/validate-layouts.mjs', '--strict']);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, new RegExp(`Themes: ${allThemes.length}`));
  for (const theme of coreThemes) assert.match(result.stdout, new RegExp(`OK \\[${theme}\\] 14 layouts`));
});

test('registered core layout catalogs generate and validate', () => {
  for (const theme of coreThemes) {
    const directory = temporaryDirectory(`layout-catalog-${theme}-`);
    const created = runNode(['scripts/render-layout-catalog.mjs', '--theme', theme, '--output', directory]);
    assert.equal(created.status, 0, `${theme} catalog generation failed:\n${combinedOutput(created)}`);
    assert.ok(fs.existsSync(path.join(directory, 'theme', 'layout-manifest.json')));
    assert.ok(fs.existsSync(path.join(directory, 'theme', 'layout-contracts.json')));

    const htmlValidation = runNode(['scripts/validate-deck.mjs', path.join(directory, 'index.html')]);
    assert.equal(htmlValidation.status, 0, `${theme} catalog HTML failed:\n${combinedOutput(htmlValidation)}`);
    assert.match(htmlValidation.stdout, /Slides: 14/);

    const manifestValidation = runNode([
      'scripts/validate-manifest.mjs', path.join(directory, 'deck.json'),
      '--html', path.join(directory, 'index.html'), '--strict',
    ]);
    assert.equal(manifestValidation.status, 0, `${theme} catalog manifest failed:\n${combinedOutput(manifestValidation)}`);
    assert.match(manifestValidation.stdout, /Registered layouts: 14/);
  }
});

test('manifest validation rejects an unregistered layout', () => {
  const directory = temporaryDirectory('layout-unregistered-');
  const created = runNode(['scripts/create-deck.mjs', '--name', 'unregistered', '--theme', 'swiss-grid', '--output', directory]);
  assert.equal(created.status, 0, combinedOutput(created));
  const manifestPath = path.join(directory, 'deck.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.slides[0].layout = 'invented-layout';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const checked = runNode(['scripts/validate-manifest.mjs', manifestPath]);
  assert.equal(checked.status, 1);
  assert.match(combinedOutput(checked), /layout\.unregistered/);
});

test('legacy grid is accepted only through the registered alias and reported', () => {
  const directory = temporaryDirectory('layout-alias-');
  const created = runNode(['scripts/create-deck.mjs', '--name', 'alias', '--theme', 'swiss-grid', '--output', directory]);
  assert.equal(created.status, 0, combinedOutput(created));
  const manifestPath = path.join(directory, 'deck.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const target = manifest.slides.find((slide) => slide.layout === 'three-up');
  assert.ok(target);
  target.layout = 'grid';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const checked = runNode(['scripts/validate-manifest.mjs', manifestPath]);
  assert.equal(checked.status, 0, combinedOutput(checked));
  assert.match(combinedOutput(checked), /layout\.legacy-alias/);
});

test('every registered selector is present in its theme CSS', () => {
  for (const theme of allThemes) {
    const root = path.join(themesRoot, theme);
    const registry = JSON.parse(fs.readFileSync(path.join(root, 'layout-manifest.json'), 'utf8'));
    const css = fs.readFileSync(path.join(root, 'layouts.css'), 'utf8');
    for (const layout of registry.layouts) assert.ok(css.includes(layout.selector), `${theme} is missing ${layout.selector}`);
  }
});
