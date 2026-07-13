import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { combinedOutput, pptRoot, runNode, temporaryDirectory } from './helpers.mjs';

const fixtureRoot = path.join(pptRoot, 'tests', 'fixtures', 'visual-plan-valid');
const fixtureHtml = path.join(fixtureRoot, 'index.html');
const fixtureManifest = path.join(fixtureRoot, 'deck.json');

test('visual QA reports coverage, layout rhythm, and semantic visual counts', () => {
  const directory = temporaryDirectory('html-ppt-visual-qa-');
  const report = path.join(directory, 'report.json');
  const result = runNode(['scripts/qa-visual.mjs', fixtureHtml, '--manifest', fixtureManifest, '--json', report, '--strict']);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, /Visual QA complete/);
  assert.match(result.stdout, /Visual slides: 4/);
  assert.match(result.stdout, /Evidence visual slides: 2/);
  assert.match(result.stdout, /Consecutive text-only maximum: 0/);
  const data = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(data.summary.slides, 4);
  assert.equal(data.findings.length, 0);
});

test('visual QA blocks a speaker-led run of plain text slides', () => {
  const directory = temporaryDirectory('html-ppt-visual-qa-text-run-');
  const html = `<!doctype html><html><style>.slide{width:1920px;height:1080px;position:absolute;visibility:hidden}.slide.active,.slide.visible{visibility:visible}</style><body><main>${[1,2,3].map((n, i) => `<section class="slide${i === 0 ? ' active visible' : ''}" data-slide-id="slide-0${n}" data-layout="content"><h2>纯文字 ${n}</h2></section>`).join('')}</main></body></html>`;
  const manifest = {
    manifestVersion: 2, id: 'text-run', title: 'text-run', language: 'zh-CN', density: 'speaker-led',
    visualStrategy: { mode: 'typography-led', targetCoverage: 0, targetEvidenceCoverage: 0, maxConsecutiveTextOnly: 2 },
    slides: [1,2,3].map((n) => ({ id: `slide-0${n}`, purpose: 'content', layout: 'content', headline: `纯文字 ${n}`, visual: { type: 'none', required: false, status: 'not-needed', source: 'none', role: 'typography' } })),
  };
  const htmlFile = path.join(directory, 'index.html');
  const manifestFile = path.join(directory, 'deck.json');
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  const result = runNode(['scripts/qa-visual.mjs', htmlFile, '--manifest', manifestFile]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /P0 \[deck\] deck.consecutive-text-only/);
});

test('visual QA recognizes evidence semantics declared on the slide root', () => {
  const directory = temporaryDirectory('html-ppt-visual-qa-root-semantics-');
  const report = path.join(directory, 'report.json');
  const html = `<!doctype html><html><style>.slide{width:1920px;height:1080px;position:absolute;visibility:hidden}.slide.active,.slide.visible{visibility:visible}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}.card{min-height:240px;border:2px solid #111}</style><body><main><section class="slide active visible" data-slide-id="slide-01" data-layout="three-up" data-visual-required="true" data-visual-type="html-visualization" data-visual-role="explanation"><h2>三个问题</h2><div class="grid"><div class="card">重复生产</div><div class="card">质量波动</div><div class="card">反馈失真</div></div></section></main></body></html>`;
  const manifest = {
    manifestVersion: 2,
    id: 'root-visual-semantics',
    title: 'root-visual-semantics',
    language: 'zh-CN',
    density: 'speaker-led',
    visualStrategy: { mode: 'diagram-first', targetCoverage: 1, targetEvidenceCoverage: 1, maxConsecutiveTextOnly: 0 },
    slides: [{
      id: 'slide-01',
      purpose: 'explain',
      layout: 'three-up',
      headline: '三个问题',
      visual: { type: 'html-visualization', required: true, status: 'ready', source: 'html', role: 'explanation' },
    }],
  };
  const htmlFile = path.join(directory, 'index.html');
  const manifestFile = path.join(directory, 'deck.json');
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  const result = runNode(['scripts/qa-visual.mjs', htmlFile, '--manifest', manifestFile, '--json', report, '--strict']);
  assert.equal(result.status, 0, combinedOutput(result));
  const data = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(data.summary.visualSlides, 1);
  assert.equal(data.summary.evidenceVisualSlides, 1);
  assert.equal(data.findings.length, 0);
});

test('contact sheet builder renders all fixture slides into a PNG', () => {
  const directory = temporaryDirectory('html-ppt-contact-sheet-');
  const output = path.join(directory, 'contact-sheet.png');
  const result = runNode(['scripts/build-contact-sheet.mjs', fixtureHtml, output, '--columns', '2']);
  assert.equal(result.status, 0, combinedOutput(result));
  assert.equal(fs.existsSync(output), true);
  assert.ok(fs.statSync(output).size > 10_000);
  assert.match(result.stdout, /4 slide\(s\)/);
});
