#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const defaultCases = path.join(skillRoot, 'tests', 'tasks', 'cases.json');
const sourceBuilder = path.join(skillRoot, 'tests', 'fixtures', 'build-source-fixtures.py');
const createDeck = path.join(scriptDir, 'create-deck.mjs');
const renderCatalog = path.join(scriptDir, 'render-layout-catalog.mjs');

const EVIDENCE_TYPES = new Set(['image','editorial-illustration','product-screenshot','data-chart','workflow-diagram','system-diagram','comparison-diagram','timeline','html-visualization']);

function usage(code = 0) {
  const text = `Usage:
  node scripts/run-task-regression.mjs [options]

Options:
  --cases <file>       Task-case JSON. Defaults to tests/tasks/cases.json.
  --output <dir>       Output root. Defaults to qa/task-regression.
  --case <id>          Run one case. Repeatable.
  --mode <contract|render>
                       Contract mode runs import, structural, manifest, bundle,
                       source mapping, and offline checks. Render mode also runs
                       visual QA, contact sheets, and Playwright mechanical QA.
  --keep-temp          Preserve temporary source fixtures and layout catalogs.
  --help               Show this help.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { cases: defaultCases, output: path.join(skillRoot, 'qa', 'task-regression'), selected: [], mode: 'contract', keepTemp: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--keep-temp') { options.keepTemp = true; continue; }
    if (arg === '--case') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) usage(2);
      options.selected.push(value);
      continue;
    }
    if (['--cases','--output','--mode'].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) usage(2);
      options[arg.slice(2)] = value;
      continue;
    }
    console.error(`Unknown option: ${arg}`);
    usage(2);
  }
  if (!['contract','render'].includes(options.mode)) throw new Error('--mode must be contract or render.');
  options.cases = path.resolve(options.cases);
  options.output = path.resolve(options.output);
  return options;
}

function run(command, args, label, cwd = skillRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${label} failed${detail ? `:\n${detail}` : '.'}`);
  }
  return result;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function escapeHtml(value = '') { return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function headlineHtml(value = '') { return escapeHtml(value).replaceAll('|','<br>'); }
function plainHeadline(value = '') { return value.replaceAll('|',' ').replace(/\s+/g,' ').trim(); }
function inferPurpose(layout) {
  if (layout === 'cover') return 'hook';
  if (layout === 'section') return 'section-reset';
  if (['statement','quote'].includes(layout)) return 'key-claim';
  if (layout === 'comparison') return 'compare';
  if (['process','timeline','chart','metrics','image-focus'].includes(layout)) return 'evidence';
  if (layout === 'closing') return 'close';
  return 'content';
}
function maxConsecutive(values, predicate) {
  let max = 0, current = 0;
  for (const value of values) { if (predicate(value)) { current += 1; max = Math.max(max, current); } else current = 0; }
  return max;
}

function validateCases(document) {
  const errors = [];
  if (!document || document.manifestVersion !== 1 || !Array.isArray(document.cases)) errors.push('Task document must contain manifestVersion 1 and a cases array.');
  const ids = new Set();
  for (const task of document?.cases || []) {
    if (!task?.id || ids.has(task.id)) errors.push(`Invalid or duplicate task ID: ${task?.id}`);
    ids.add(task?.id);
    if (!task.title || !task.theme || !['speaker-led','reading-first'].includes(task.density)) errors.push(`${task.id}: title, theme, and valid density are required.`);
    if (!Array.isArray(task.slides) || !task.slides.length) errors.push(`${task.id}: slides must be non-empty.`);
    if (task.expected?.slideCount !== task.slides?.length) errors.push(`${task.id}: expected.slideCount must equal slides.length.`);
    const layouts = new Set((task.slides || []).map((slide) => slide.layout));
    for (const layout of task.expected?.requiredLayouts || []) if (!layouts.has(layout)) errors.push(`${task.id}: required layout ${layout} is absent.`);
    if (task.source && !Array.isArray(task.sourceMapping)) errors.push(`${task.id}: sourceMapping is required for source-backed cases.`);
    if (!task.source && task.sourceMapping) errors.push(`${task.id}: sourceMapping is only valid with source.`);
    if (task.expected?.longTitleRequired && !task.slides.some((slide) => slide.headline.includes('|'))) errors.push(`${task.id}: long-title case must declare an explicit semantic break with |.`);
  }
  if (errors.length) throw new Error(`Task case validation failed:\n- ${errors.join('\n- ')}`);
}

function extractSections(html) {
  const matches = [...html.matchAll(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi)];
  const result = new Map();
  for (const match of matches) {
    const layout = match[0].match(/data-layout=["']([^"']+)["']/i)?.[1];
    if (layout && !result.has(layout)) result.set(layout, match[0]);
  }
  return result;
}

function customizeSection(template, task, slide, index, total) {
  const id = `slide-${String(index + 1).padStart(2, '0')}`;
  let section = template;
  section = section.replace(/data-slide-id=["'][^"']+["']/i, `data-slide-id="${id}"`);
  section = section.replace(/data-layout=["'][^"']+["']/i, `data-layout="${slide.layout}"`);
  section = section.replace(/class=["']([^"']*\bslide\b[^"']*)["']/i, (_, classes) => {
    const cleaned = classes.split(/\s+/).filter((name) => name && !['active','visible'].includes(name));
    if (index === 0) cleaned.push('active','visible');
    return `class="${cleaned.join(' ')}"`;
  });
  section = section.replace(/<section\b/i, `<section data-visual-type="${escapeHtml(slide.visual.type)}" data-visual-required="${slide.visual.required ? 'true' : 'false'}"`);
  section = section.replace(/data-element-id=["']([^"']+)["']/gi, (_, value) => `data-element-id="${task.id}-${id}-${value}"`);
  const title = headlineHtml(slide.headline);
  if (/<h[1-3]\b/i.test(section)) section = section.replace(/(<h[1-3]\b[^>]*>)[\s\S]*?(<\/h[1-3]>)/i, `$1${title}$2`);
  else if (/theme-quote__text/.test(section)) section = section.replace(/(<(?:blockquote|div)\b[^>]*class=["'][^"']*theme-quote__text[^"']*["'][^>]*>)[\s\S]*?(<\/(?:blockquote|div)>)/i, `$1${title}$2`);
  if (slide.body && /<p\b/i.test(section)) section = section.replace(/(<p\b[^>]*>)[\s\S]*?(<\/p>)/i, `$1${escapeHtml(slide.body)}$2`);
  if (slide.assetPath) {
    const image = `<img class="task-source-image" data-editable="image" data-element-id="${task.id}-${id}-source-image" data-image-slot="${escapeHtml(slide.visual.slot || '16:9')}" src="${escapeHtml(slide.assetPath)}" alt="${escapeHtml(slide.visual.alt || 'Source evidence')}" />`;
    section = section.replace(/(<div\b[^>]*class=["'][^"']*theme-image-focus__media[^"']*["'][^>]*>)/i, `$1${image}`);
  }
  section = section.replace(/\b\d{2}\s*\/\s*\d{2}\b/g, `${String(index + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`);
  return section;
}

function buildTaskHtml(catalogHtml, task, catalogSections) {
  const selected = task.slides.map((slide, index) => {
    const template = catalogSections.get(slide.layout);
    if (!template) throw new Error(`${task.id}: layout ${slide.layout} is not available in ${task.theme} catalog.`);
    return customizeSection(template, task, slide, index, task.slides.length);
  }).join('\n');
  let html = catalogHtml
    .replace(/<html lang=["'][^"']*["']/i, `<html lang="${escapeHtml(task.language)}"`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(task.title)}</title>`)
    .replace(/data-deck-id=["'][^"']+["']/i, `data-deck-id="${task.id}"`)
    .replace(/<main\b([^>]*\bclass=["'][^"']*\bdeck-stage\b[^"']*["'][^>]*)>[\s\S]*?<\/main>/i, `<main$1>${selected}</main>`);
  html = html.replace('</head>', `<style>.task-source-image{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;z-index:2}.theme-image-focus__media{position:relative;overflow:hidden}</style></head>`);
  return html;
}

function manifestForTask(task, generated, sourceInfo) {
  const theme = readJson(path.join(generated, 'theme', 'theme.json'));
  return {
    $schema: 'https://github.com/yaney01/skill/blob/main/ppt/schemas/deck.schema.json',
    manifestVersion: 2,
    id: task.id,
    title: task.title,
    language: task.language,
    density: task.density,
    style: task.theme,
    themeName: theme.name,
    themeTier: theme.tier || 'core',
    layoutRegistry: 'theme/layout-manifest.json',
    ...(sourceInfo ? { source: { ...sourceInfo, mapping: task.sourceMapping } } : {}),
    visualStrategy: task.visualStrategy,
    slides: task.slides.map((slide, index) => ({
      id: `slide-${String(index + 1).padStart(2,'0')}`,
      purpose: inferPurpose(slide.layout),
      layout: slide.layout,
      headline: plainHeadline(slide.headline),
      visual: slide.visual,
    })),
    createdAt: new Date().toISOString(),
    generator: 'html-ppt-task-regression',
  };
}

function assertTaskContract(task, project, manifest, sourceManifest) {
  const errors = [];
  const slides = manifest.slides;
  if (slides.length !== task.expected.slideCount) errors.push(`slide count ${slides.length} != ${task.expected.slideCount}`);
  const uniqueLayouts = new Set(slides.map((slide) => slide.layout));
  if (uniqueLayouts.size < task.expected.uniqueLayoutsMin) errors.push(`unique layouts ${uniqueLayouts.size} < ${task.expected.uniqueLayoutsMin}`);
  for (const layout of task.expected.requiredLayouts) if (!uniqueLayouts.has(layout)) errors.push(`required layout missing: ${layout}`);
  const visualCount = slides.filter((slide) => slide.visual.type !== 'none').length;
  const evidenceCount = slides.filter((slide) => EVIDENCE_TYPES.has(slide.visual.type)).length;
  const visualCoverage = visualCount / slides.length;
  const evidenceCoverage = evidenceCount / slides.length;
  if (visualCoverage + 1e-9 < task.visualStrategy.targetCoverage) errors.push(`visual coverage ${visualCoverage} below target ${task.visualStrategy.targetCoverage}`);
  if (evidenceCoverage + 1e-9 < task.visualStrategy.targetEvidenceCoverage) errors.push(`evidence coverage ${evidenceCoverage} below target ${task.visualStrategy.targetEvidenceCoverage}`);
  const textRun = maxConsecutive(slides, (slide) => slide.visual.type === 'none');
  if (textRun > task.visualStrategy.maxConsecutiveTextOnly) errors.push(`text-only run ${textRun} exceeds ${task.visualStrategy.maxConsecutiveTextOnly}`);

  if (task.expected.sourceCoverage) {
    if (!sourceManifest || !manifest.source) errors.push('source coverage expected but source manifests are missing');
    else {
      const sourceIds = new Set(sourceManifest.pages.map((page) => page.id));
      const mapped = new Set();
      const slideIds = new Set(slides.map((slide) => slide.id));
      for (const mapping of manifest.source.mapping || []) {
        for (const sourceId of mapping.sourceIds || []) { if (!sourceIds.has(sourceId)) errors.push(`unknown source ID ${sourceId}`); mapped.add(sourceId); }
        for (const slideId of mapping.slideIds || []) if (!slideIds.has(slideId)) errors.push(`unknown mapped slide ID ${slideId}`);
        if (mapping.treatment === 'omit' && (mapping.slideIds || []).length) errors.push('omit mapping must not contain slide IDs');
        if (mapping.treatment !== 'omit' && !(mapping.slideIds || []).length) errors.push(`${mapping.treatment} mapping requires slide IDs`);
      }
      for (const sourceId of sourceIds) if (!mapped.has(sourceId)) errors.push(`unmapped source ID ${sourceId}`);
      if (task.expected.preserveSourceOneToOne) {
        for (const mapping of manifest.source.mapping || []) {
          if (mapping.treatment !== 'preserve' || mapping.sourceIds.length !== 1 || mapping.slideIds.length !== 1) errors.push('preserve-layout case requires one preserve mapping per source page and slide');
        }
      }
      for (const warning of task.source.expectedWarnings || []) if (!(sourceManifest.warnings || []).some((item) => item.code === warning)) errors.push(`expected source warning missing: ${warning}`);
    }
  }
  if (task.expected.longTitleRequired) {
    const first = fs.readFileSync(path.join(project, 'index.html'), 'utf8').match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || '';
    if (!/<br\s*\/?\s*>/i.test(first)) errors.push('long title did not retain its explicit semantic line break');
  }
  if (errors.length) throw new Error(`${task.id} contract failed:\n- ${errors.join('\n- ')}`);
  return { visualCoverage, evidenceCoverage, uniqueLayouts: uniqueLayouts.size, maxConsecutiveTextOnly: textRun };
}

function assertOffline(project, bundleFile) {
  const files = [path.join(project,'index.html')];
  for (const directory of ['runtime','theme']) {
    const absolute = path.join(project, directory);
    if (!fs.existsSync(absolute)) continue;
    for (const name of fs.readdirSync(absolute)) if (/\.(?:css|js|html)$/i.test(name)) files.push(path.join(absolute, name));
  }
  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const patterns = [/(?:src|href)\s*=\s*["']https?:\/\//ig, /@import\s+(?:url\()?\s*["']?https?:\/\//ig, /url\(\s*["']?https?:\/\//ig, /fetch\(\s*["']https?:\/\//ig];
    for (const pattern of patterns) if (pattern.test(text)) findings.push(path.relative(project, file));
  }
  const bundled = fs.readFileSync(bundleFile, 'utf8');
  if (/(?:src|href)\s*=\s*["']https?:\/\//i.test(bundled)) findings.push(path.basename(bundleFile));
  if (findings.length) throw new Error(`External runtime dependency detected in: ${[...new Set(findings)].join(', ')}`);
}

function makeSourceInfo(task, sourceManifest) {
  if (!task.source) return null;
  return {
    manifest: 'source/manifest.json',
    originalFile: sourceManifest.source.fileName,
    type: sourceManifest.source.type,
    mode: task.source.mode,
  };
}

function runCase(task, context) {
  const started = Date.now();
  const project = path.join(context.output, task.id);
  fs.rmSync(project, { recursive: true, force: true });
  const fixture = task.source ? path.join(context.fixtures, task.source.fixture) : null;
  const createArgs = [createDeck, '--name', task.id, '--title', task.title, '--lang', task.language, '--theme', task.theme, '--output', project];
  if (fixture) {
    createArgs.push('--source', fixture);
    if (task.source.mode === 'preserve-layout') createArgs.push('--preserve-layout');
    if (task.source.strict) createArgs.push('--strict-source');
  }
  run(process.execPath, createArgs, `${task.id}: create project`);

  const catalog = context.catalogs.get(task.theme);
  const html = buildTaskHtml(catalog.html, task, catalog.sections);
  fs.writeFileSync(path.join(project, 'index.html'), html, 'utf8');
  const sourceManifest = fixture ? readJson(path.join(project, 'source', 'manifest.json')) : null;
  const manifest = manifestForTask(task, project, makeSourceInfo(task, sourceManifest));
  writeJson(path.join(project, 'deck.json'), manifest);

  if (fixture) {
    const sourceArgs = [path.join(scriptDir, 'validate-source.mjs'), path.join(project,'source','manifest.json'), '--source', fixture];
    if (task.source.strict) sourceArgs.push('--strict');
    run(process.execPath, sourceArgs, `${task.id}: source validation`);
  }
  run(process.execPath, [path.join(scriptDir,'validate-deck.mjs'), path.join(project,'index.html')], `${task.id}: structural validation`);
  run(process.execPath, [path.join(scriptDir,'validate-manifest.mjs'), path.join(project,'deck.json'), '--html', path.join(project,'index.html'), '--strict'], `${task.id}: manifest validation`);

  const bundleDirectory = path.join(project, 'dist');
  const bundleFile = path.join(bundleDirectory, `${task.id}.html`);
  fs.mkdirSync(bundleDirectory, { recursive: true });
  run(process.execPath, [path.join(scriptDir,'bundle-html.mjs'), path.join(project,'index.html'), bundleFile], `${task.id}: bundle`);
  run(process.execPath, [path.join(scriptDir,'validate-deck.mjs'), bundleFile], `${task.id}: bundled validation`);

  if (task.expected.offline) assertOffline(project, bundleFile);
  const summary = assertTaskContract(task, project, manifest, sourceManifest);

  if (context.mode === 'render') {
    const qa = path.join(project, 'qa');
    fs.mkdirSync(qa, { recursive: true });
    run(process.execPath, [path.join(scriptDir,'qa-visual.mjs'), path.join(project,'index.html'), '--manifest', path.join(project,'deck.json'), '--json', path.join(qa,'visual-report.json')], `${task.id}: visual QA`);
    run(process.execPath, [path.join(scriptDir,'build-contact-sheet.mjs'), path.join(project,'index.html'), path.join(qa,'contact-sheet.png')], `${task.id}: contact sheet`);
    run(process.execPath, [path.join(scriptDir,'qa-deck.mjs'), path.join(project,'index.html'), '--screenshots', path.join(qa,'screenshots')], `${task.id}: mechanical browser QA`);
  }

  const report = {
    id: task.id,
    title: task.title,
    theme: task.theme,
    density: task.density,
    sourceType: sourceManifest?.source?.type || null,
    sourceMode: task.source?.mode || null,
    slides: manifest.slides.length,
    ...summary,
    bundled: path.relative(project, bundleFile),
    rendered: context.mode === 'render',
    durationMs: Date.now() - started,
    result: 'passed',
  };
  writeJson(path.join(project, 'qa', 'task-report.json'), report);
  return report;
}

let options;
try { options = parseArgs(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exit(2); }
if (!fs.existsSync(options.cases)) { console.error(`Task cases not found: ${options.cases}`); process.exit(2); }

const document = readJson(options.cases);
try { validateCases(document); }
catch (error) { console.error(error.message); process.exit(1); }
let tasks = document.cases;
if (options.selected.length) {
  const requested = new Set(options.selected);
  tasks = tasks.filter((task) => requested.has(task.id));
  for (const id of requested) if (!tasks.some((task) => task.id === id)) { console.error(`Unknown task case: ${id}`); process.exit(2); }
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-task-regression-'));
const fixtures = path.join(tempRoot, 'fixtures');
const catalogsRoot = path.join(tempRoot, 'catalogs');
fs.mkdirSync(options.output, { recursive: true });
const reports = [];
const failures = [];

try {
  run(process.env.PYTHON || 'python3', [sourceBuilder, fixtures], 'Build source fixtures');
  const catalogs = new Map();
  for (const theme of new Set(tasks.map((task) => task.theme))) {
    const directory = path.join(catalogsRoot, theme);
    run(process.execPath, [renderCatalog, '--theme', theme, '--output', directory], `Render ${theme} task catalog`);
    const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
    catalogs.set(theme, { html, sections: extractSections(html) });
  }
  for (const task of tasks) {
    try {
      const report = runCase(task, { output: options.output, fixtures, catalogs, mode: options.mode });
      reports.push(report);
      console.log(`PASS ${task.id}: ${report.slides} slides, ${Math.round(report.evidenceCoverage * 100)}% evidence coverage.`);
    } catch (error) {
      failures.push({ id: task.id, message: error.message });
      console.error(`FAIL ${task.id}: ${error.message}`);
    }
  }
} finally {
  if (!options.keepTemp) fs.rmSync(tempRoot, { recursive: true, force: true });
  else console.log(`Temporary fixtures: ${tempRoot}`);
}

const overall = {
  generatedAt: new Date().toISOString(),
  mode: options.mode,
  cases: tasks.length,
  passed: reports.length,
  failed: failures.length,
  totalSlides: reports.reduce((sum, report) => sum + report.slides, 0),
  sourceBacked: reports.filter((report) => report.sourceType).length,
  reports,
  failures,
};
writeJson(path.join(options.output, 'report.json'), overall);
console.log('Task regression complete');
console.log(`Cases: ${overall.cases}`);
console.log(`Passed: ${overall.passed}`);
console.log(`Failed: ${overall.failed}`);
console.log(`Slides: ${overall.totalSlides}`);
console.log(`Report: ${path.join(options.output, 'report.json')}`);
if (failures.length) process.exitCode = 1;
