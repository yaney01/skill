import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pptRoot = path.resolve(here, '..');
const casesFile = path.join(pptRoot, 'tests', 'tasks', 'cases.json');
const validator = path.join(pptRoot, 'scripts', 'validate-task-cases.mjs');
const runner = path.join(pptRoot, 'scripts', 'run-task-regression.mjs');
function run(args) { return spawnSync(process.execPath, args, { cwd: pptRoot, encoding: 'utf8' }); }
function output(result) { return `${result.stdout || ''}\n${result.stderr || ''}`; }

test('task case registry validates against installed theme layouts', () => {
  const result = run([validator, casesFile, '--strict']);
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /Cases: 10/);
  assert.match(output(result), /0 error\(s\), 0 warning\(s\)/);
});

test('contract regression builds topic, source, preserve-layout, and CJK cases', () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-task-contract-'));
  const result = run([
    runner,
    '--output', outputRoot,
    '--mode', 'contract',
    '--case', 'topic-only-zh-speaker',
    '--case', 'markdown-with-images',
    '--case', 'pptx-preserve-layout',
    '--case', 'cjk-long-title',
  ]);
  assert.equal(result.status, 0, output(result));
  const report = JSON.parse(fs.readFileSync(path.join(outputRoot, 'report.json'), 'utf8'));
  assert.equal(report.cases, 4);
  assert.equal(report.passed, 4);
  assert.equal(report.failed, 0);
  assert.equal(report.sourceBacked, 2);
  assert.equal(report.totalSlides, 19);
  for (const id of ['topic-only-zh-speaker','markdown-with-images','pptx-preserve-layout','cjk-long-title']) {
    const project = path.join(outputRoot, id);
    assert.equal(fs.existsSync(path.join(project, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(project, 'deck.json')), true);
    assert.equal(fs.existsSync(path.join(project, 'dist', `${id}.html`)), true);
    assert.equal(fs.existsSync(path.join(project, 'qa', 'task-report.json')), true);
  }
  const preserved = JSON.parse(fs.readFileSync(path.join(outputRoot, 'pptx-preserve-layout', 'deck.json'), 'utf8'));
  assert.equal(preserved.source.mode, 'preserve-layout');
  assert.deepEqual(preserved.source.mapping[0].sourceIds, ['page-001']);
  assert.deepEqual(preserved.source.mapping[0].slideIds, ['slide-01']);
  assert.equal(preserved.source.mapping[0].treatment, 'preserve');
  const longHtml = fs.readFileSync(path.join(outputRoot, 'cjk-long-title', 'index.html'), 'utf8');
  assert.match(longHtml, /可复用、可验证、<br>可持续迭代/);
});

test('task validator rejects a layout that is not registered for the selected theme', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-task-invalid-'));
  const invalid = JSON.parse(fs.readFileSync(casesFile, 'utf8'));
  invalid.cases = [structuredClone(invalid.cases[0])];
  invalid.cases[0].slides[0].layout = 'dashboard-freeform';
  const file = path.join(root, 'cases.json');
  fs.writeFileSync(file, `${JSON.stringify(invalid, null, 2)}\n`);
  const result = run([validator, file, '--strict']);
  assert.equal(result.status, 1);
  assert.match(output(result), /task\.layout-unregistered/);
});

test('task runner rejects unknown case IDs without creating a report', () => {
  const outputRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-task-unknown-')), 'output');
  const result = run([runner, '--output', outputRoot, '--case', 'not-a-task']);
  assert.equal(result.status, 2);
  assert.match(output(result), /Unknown task case/);
  assert.equal(fs.existsSync(path.join(outputRoot, 'report.json')), false);
});
