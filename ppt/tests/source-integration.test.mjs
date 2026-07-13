import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pptRoot = path.resolve(here, '..');
const createDeck = path.join(pptRoot, 'scripts', 'create-deck.mjs');
const validateSource = path.join(pptRoot, 'scripts', 'validate-source.mjs');
const fixtureBuilder = path.join(pptRoot, 'tests', 'fixtures', 'build-source-fixtures.py');

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: pptRoot, encoding: 'utf8', ...options });
}

function output(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function load(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-source-project-'));
  const fixtures = path.join(root, 'fixtures');
  const built = run('python3', [fixtureBuilder, fixtures]);
  assert.equal(built.status, 0, output(built));
  return { root, fixtures };
}

test('create-deck --source creates a validated source-aware project', () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.md');
  const project = path.join(root, 'project');
  const created = run(process.execPath, [
    createDeck,
    '--name', 'source-aware',
    '--title', 'Source-aware deck',
    '--source', source,
    '--output', project,
  ]);
  assert.equal(created.status, 0, output(created));

  const sourceManifest = path.join(project, 'source', 'manifest.json');
  assert.ok(fs.existsSync(sourceManifest));
  assert.ok(fs.existsSync(path.join(project, 'source', 'text', 'page-001.md')));
  assert.ok(fs.existsSync(path.join(project, 'source', 'images', 'page-001-image-01.png')));

  const deck = load(path.join(project, 'deck.json'));
  assert.deepEqual(deck.source, {
    manifest: 'source/manifest.json',
    originalFile: 'sample.md',
    type: 'markdown',
    mode: 'semantic',
    mapping: [],
  });
  assert.match(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), /deck\.json\.source\.mapping/);
  assert.match(output(created), /Source: markdown — 2 pages\/sections/);

  const checked = run(process.execPath, [validateSource, sourceManifest, '--source', source]);
  assert.equal(checked.status, 0, output(checked));
});

test('create-deck --source --preserve-layout retains PPTX geometry policy', () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.pptx');
  const project = path.join(root, 'project');
  const created = run(process.execPath, [
    createDeck,
    '--name', 'preserved-source',
    '--source', source,
    '--preserve-layout',
    '--strict-source',
    '--theme', 'swiss-grid',
    '--output', project,
  ]);
  assert.equal(created.status, 0, output(created));

  const sourceManifest = load(path.join(project, 'source', 'manifest.json'));
  const deck = load(path.join(project, 'deck.json'));
  assert.equal(deck.source.mode, 'preserve-layout');
  assert.equal(sourceManifest.pages[0].preservation.layout, true);
  assert.equal(sourceManifest.pages[0].preservation.allowMerge, false);
  assert.equal(sourceManifest.pages[0].preservation.allowCondense, false);
  assert.equal(sourceManifest.pages[0].preservation.allowOmit, false);
  assert.ok(sourceManifest.pages[0].elements.some((element) => element.geometry?.unit === 'EMU'));
  assert.ok(fs.existsSync(path.join(project, 'theme', 'cjk.css')));
});

test('source policy flags require --source and conflicting policies are rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-source-flags-'));
  const noSource = run(process.execPath, [createDeck, '--name', 'bad', '--preserve-layout', '--output', path.join(root, 'one')]);
  assert.equal(noSource.status, 2);
  assert.match(output(noSource), /require --source/);

  const { fixtures } = setup();
  const conflict = run(process.execPath, [
    createDeck,
    '--name', 'bad-two',
    '--source', path.join(fixtures, 'sample.md'),
    '--preserve-layout',
    '--allow-omit',
    '--output', path.join(root, 'two'),
  ]);
  assert.equal(conflict.status, 2);
  assert.match(output(conflict), /conflicting source policies/);
});

test('failed source preflight does not create a partial project', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-source-preflight-'));
  const unsupported = path.join(root, 'unsupported.txt');
  const project = path.join(root, 'project');
  fs.writeFileSync(unsupported, 'not a supported source');

  const created = run(process.execPath, [
    createDeck,
    '--name', 'unsupported',
    '--source', unsupported,
    '--output', project,
  ]);
  assert.equal(created.status, 1);
  assert.match(output(created), /Unsupported source type/);
  assert.equal(fs.existsSync(project), false);
});
