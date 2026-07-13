import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const fixtureRoot = path.join(pptRoot, 'tests', 'fixtures', 'visual-plan-valid');
const fixtureManifest = path.join(fixtureRoot, 'deck.json');
const fixtureHtml = path.join(fixtureRoot, 'index.html');

test('deck production schema is valid JSON and defines visual planning fields', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(pptRoot, 'schemas', 'deck.schema.json'), 'utf8'));
  assert.equal(schema.properties.visualStrategy.type, 'object');
  assert.equal(schema.properties.slides.type, 'array');
  assert.ok(schema.$defs.visual.properties.type.enum.includes('workflow-diagram'));
  assert.ok(schema.$defs.visual.properties.type.enum.includes('intentional-text'));
});

test('valid visual production manifest passes static and HTML cross-validation', () => {
  const result = runNode(['scripts/validate-manifest.mjs', fixtureManifest, '--html', fixtureHtml, '--strict']);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, /Slides: 4/);
  assert.match(result.stdout, /Evidence visual slides: 2/);
  assert.match(result.stdout, /Result: 0 error\(s\), 0 warning\(s\)/);
});

test('required visual that is not ready fails manifest validation', () => {
  const directory = temporaryDirectory('html-ppt-invalid-visual-');
  const manifest = JSON.parse(fs.readFileSync(fixtureManifest, 'utf8'));
  manifest.slides[1].visual.status = 'missing';
  const file = path.join(directory, 'deck.json');
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = runNode(['scripts/validate-manifest.mjs', file]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /visual.required-not-ready/);
});

test('manifest validation catches missing required visual markup', () => {
  const directory = temporaryDirectory('html-ppt-missing-visual-dom-');
  const html = fs.readFileSync(fixtureHtml, 'utf8').replace('data-visual-type="workflow-diagram"', 'data-removed-visual="workflow-diagram"').replace('class="visual nodes"', 'class="nodes"');
  const htmlFile = path.join(directory, 'index.html');
  fs.writeFileSync(htmlFile, html);
  const result = runNode(['scripts/validate-manifest.mjs', fixtureManifest, '--html', htmlFile]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /visual.required-missing-in-html/);
});

test('create-deck writes a versioned production manifest with per-slide visual decisions', () => {
  const directory = temporaryDirectory('html-ppt-visual-manifest-project-');
  const result = runNode(['scripts/create-deck.mjs', '--name', 'visual-project', '--title', '视觉项目', '--theme', 'swiss-grid', '--output', directory]);
  assert.equal(result.status, 0, combinedOutput(result));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'deck.json'), 'utf8'));
  assert.equal(manifest.manifestVersion, 2);
  assert.equal(Array.isArray(manifest.slides), true);
  assert.equal(manifest.slides.length, 6);
  assert.equal(typeof manifest.visualStrategy.targetCoverage, 'number');
  for (const slide of manifest.slides) {
    assert.equal(typeof slide.id, 'string');
    assert.equal(typeof slide.visual.type, 'string');
    assert.equal(typeof slide.visual.required, 'boolean');
  }
  assert.equal(fs.existsSync(path.join(directory, 'theme', 'cjk.css')), true);
  const validation = runNode(['scripts/validate-manifest.mjs', path.join(directory, 'deck.json'), '--html', path.join(directory, 'index.html')]);
  assert.equal(validation.status, 0, combinedOutput(validation));
});
