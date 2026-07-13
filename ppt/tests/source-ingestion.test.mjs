import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pptRoot = path.resolve(here, '..');
const ingest = path.join(pptRoot, 'scripts', 'ingest-source.py');
const validate = path.join(pptRoot, 'scripts', 'validate-source.mjs');
const builder = path.join(pptRoot, 'tests', 'fixtures', 'build-source-fixtures.py');

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: pptRoot, encoding: 'utf8', ...options });
}
function output(result) { return `${result.stdout || ''}\n${result.stderr || ''}`; }
function load(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-source-ingest-'));
  const fixtures = path.join(root, 'fixtures');
  const built = run('python3', [builder, fixtures]);
  assert.equal(built.status, 0, output(built));
  return { root, fixtures };
}

for (const [filename, type, pages, images, tables, charts] of [
  ['sample.pptx', 'pptx', 1, 1, 1, 1],
  ['sample.docx', 'docx', 2, 1, 1, 0],
  ['sample.md', 'markdown', 2, 1, 1, 0],
]) {
  test(`ingests and validates ${type}`, () => {
    const { root, fixtures } = setup();
    const source = path.join(fixtures, filename);
    const destination = path.join(root, 'source');
    const imported = run('python3', [ingest, source, '--output', destination, '--allow-omit']);
    assert.equal(imported.status, 0, output(imported));
    const manifest = load(path.join(destination, 'manifest.json'));
    assert.equal(manifest.source.type, type);
    assert.equal(manifest.pageCount, pages);
    assert.equal(manifest.assets.images.length, images);
    assert.equal(manifest.assets.tables.length, tables);
    assert.equal(manifest.assets.charts.length, charts);
    const checked = run(process.execPath, [validate, path.join(destination, 'manifest.json'), '--source', source, '--strict']);
    assert.equal(checked.status, 0, output(checked));
  });
}

test('PPTX preserve-layout records geometry and locks restructuring', () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.pptx');
  const destination = path.join(root, 'source');
  const imported = run('python3', [ingest, source, '--output', destination, '--preserve-layout']);
  assert.equal(imported.status, 0, output(imported));
  const page = load(path.join(destination, 'manifest.json')).pages[0];
  assert.equal(page.preservation.layout, true);
  assert.equal(page.preservation.allowMerge, false);
  assert.equal(page.preservation.allowCondense, false);
  assert.equal(page.preservation.allowOmit, false);
  assert.ok(page.elements.some((element) => element.geometry?.unit === 'EMU'));
  assert.ok(fs.existsSync(path.join(destination, page.notesPath)));
});

test('PDF ingestion uses Poppler when available and records flattened-layout warning', { skip: spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error?.code === 'ENOENT' }, () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.pdf');
  const destination = path.join(root, 'source');
  const imported = run('python3', [ingest, source, '--output', destination]);
  assert.equal(imported.status, 0, output(imported));
  const manifest = load(path.join(destination, 'manifest.json'));
  assert.equal(manifest.source.type, 'pdf');
  assert.equal(manifest.pageCount, 1);
  assert.match(fs.readFileSync(path.join(destination, manifest.pages[0].textPath), 'utf8'), /Standardized PDF source/);
  assert.ok(manifest.warnings.some((warning) => warning.code === 'pdf.layout-flattened'));
  const checked = run(process.execPath, [validate, path.join(destination, 'manifest.json'), '--source', source]);
  assert.equal(checked.status, 0, output(checked));
  assert.match(output(checked), /import\.pdf\.layout-flattened/);
});

test('refuses destructive overwrite without --force', () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.md');
  const destination = path.join(root, 'source');
  assert.equal(run('python3', [ingest, source, '--output', destination]).status, 0);
  const blocked = run('python3', [ingest, source, '--output', destination]);
  assert.equal(blocked.status, 2);
  assert.match(output(blocked), /--force/);
  const replaced = run('python3', [ingest, source, '--output', destination, '--force']);
  assert.equal(replaced.status, 0, output(replaced));
});

test('rejects unsupported source extensions', () => {
  const { root } = setup();
  const source = path.join(root, 'sample.txt');
  fs.writeFileSync(source, 'plain text');
  const imported = run('python3', [ingest, source, '--output', path.join(root, 'source')]);
  assert.equal(imported.status, 2);
  assert.match(output(imported), /Unsupported source type/);
});

test('validator detects original-file digest mismatch', () => {
  const { root, fixtures } = setup();
  const source = path.join(fixtures, 'sample.md');
  const destination = path.join(root, 'source');
  assert.equal(run('python3', [ingest, source, '--output', destination]).status, 0);
  fs.appendFileSync(source, '\nchanged\n');
  const checked = run(process.execPath, [validate, path.join(destination, 'manifest.json'), '--source', source]);
  assert.equal(checked.status, 1);
  assert.match(output(checked), /source\.digest-mismatch/);
});
