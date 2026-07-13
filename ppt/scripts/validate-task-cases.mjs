#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const args = process.argv.slice(2);
const file = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(skillRoot, 'tests', 'tasks', 'cases.json'));
const strict = args.includes('--strict');
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/validate-task-cases.mjs [cases.json] [--strict]');
  process.exit(0);
}
if (!fs.existsSync(file)) { console.error(`Task cases not found: ${file}`); process.exit(2); }
let document;
try { document = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (error) { console.error(`Invalid task JSON: ${error.message}`); process.exit(1); }

const findings = [];
const ids = new Set();
const visualTypes = new Set(['image','editorial-illustration','product-screenshot','data-chart','workflow-diagram','system-diagram','comparison-diagram','timeline','html-visualization','typographic','intentional-text','none']);
function finding(level, code, message, task = null) { findings.push({ level, code, message, task }); }

if (document.manifestVersion !== 1) finding('error','task.version','manifestVersion must be 1.');
if (!Array.isArray(document.cases) || !document.cases.length) finding('error','task.cases','cases must be a non-empty array.');
for (const task of document.cases || []) {
  if (!task?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task.id)) finding('error','task.id','Task ID must be a lowercase kebab-case string.', task?.id);
  else if (ids.has(task.id)) finding('error','task.duplicate-id',`Duplicate task ID: ${task.id}`, task.id);
  else ids.add(task.id);
  if (!task.title || !task.language || !['speaker-led','reading-first'].includes(task.density)) finding('error','task.metadata','title, language, and valid density are required.', task.id);
  const registryPath = path.join(skillRoot, 'assets', 'themes', task.theme || '', 'layout-manifest.json');
  let registered = new Set();
  if (!fs.existsSync(registryPath)) finding('error','task.theme',`Theme registry not found: ${task.theme}`, task.id);
  else {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      registered = new Set((registry.layouts || []).map((layout) => layout.id));
    } catch (error) { finding('error','task.registry-json',error.message,task.id); }
  }
  if (!Array.isArray(task.slides) || !task.slides.length) finding('error','task.slides','slides must be non-empty.',task.id);
  const slideIds = new Set();
  for (const [index, slide] of (task.slides || []).entries()) {
    const slideId = `slide-${String(index + 1).padStart(2,'0')}`;
    slideIds.add(slideId);
    if (!registered.has(slide.layout)) finding('error','task.layout-unregistered',`${slide.layout} is not registered for ${task.theme}.`,task.id);
    if (!slide.headline?.trim()) finding('error','task.headline',`${slideId} requires a headline.`,task.id);
    if (!slide.visual || !visualTypes.has(slide.visual.type)) finding('error','task.visual',`${slideId} has an invalid visual decision.`,task.id);
    if (slide.assetPath && slide.visual?.path !== slide.assetPath) finding('error','task.asset-path',`${slideId} assetPath and visual.path must match.`,task.id);
  }
  if (task.expected?.slideCount !== task.slides?.length) finding('error','task.slide-count','expected.slideCount must equal slides.length.',task.id);
  const layouts = new Set((task.slides || []).map((slide) => slide.layout));
  if (layouts.size < (task.expected?.uniqueLayoutsMin || 0)) finding('error','task.layout-variety',`Only ${layouts.size} unique layouts; expected at least ${task.expected?.uniqueLayoutsMin}.`,task.id);
  for (const layout of task.expected?.requiredLayouts || []) if (!layouts.has(layout)) finding('error','task.required-layout',`Required layout missing: ${layout}.`,task.id);
  if (task.source && !Array.isArray(task.sourceMapping)) finding('error','task.source-mapping','Source-backed task requires sourceMapping.',task.id);
  if (!task.source && task.sourceMapping) finding('error','task.unexpected-mapping','Non-source task must not declare sourceMapping.',task.id);
  for (const mapping of task.sourceMapping || []) {
    if (!mapping.reason?.trim()) finding('error','task.mapping-reason','Source mapping requires a reason.',task.id);
    if (!Array.isArray(mapping.sourceIds) || !mapping.sourceIds.length) finding('error','task.mapping-source','Source mapping requires sourceIds.',task.id);
    for (const sourceId of mapping.sourceIds || []) if (!/^page-\d{3,}$/.test(sourceId)) finding('error','task.mapping-source-id',`Invalid source ID: ${sourceId}.`,task.id);
    for (const slideId of mapping.slideIds || []) if (!slideIds.has(slideId)) finding('error','task.mapping-slide-id',`Unknown slide ID: ${slideId}.`,task.id);
    if (mapping.treatment === 'omit' && mapping.slideIds?.length) finding('error','task.mapping-omit','Omit mappings cannot contain slide IDs.',task.id);
    if (mapping.treatment !== 'omit' && !mapping.slideIds?.length) finding('error','task.mapping-empty','Non-omit mapping requires slide IDs.',task.id);
  }
  if (task.source?.mode === 'preserve-layout') {
    for (const mapping of task.sourceMapping || []) if (mapping.treatment !== 'preserve' || mapping.sourceIds.length !== 1 || mapping.slideIds.length !== 1) finding('error','task.preserve-one-to-one','Preserve-layout task requires one-to-one preserve mappings.',task.id);
  }
  if (task.expected?.longTitleRequired && !(task.slides || []).some((slide) => slide.headline.includes('|'))) finding('error','task.long-title-break','Long-title task requires an explicit | semantic break.',task.id);
}
for (const item of findings) console.log(`${item.level === 'error' ? 'ERROR' : 'WARN'}${item.task ? ` [${item.task}]` : ''} ${item.code}: ${item.message}`);
const errors = findings.filter((item) => item.level === 'error').length;
const warnings = findings.length - errors;
console.log('Task case validation complete');
console.log(`Cases: ${document.cases?.length || 0}`);
console.log(`Result: ${errors} error(s), ${warnings} warning(s).`);
if (errors || (strict && warnings)) process.exitCode = 1;
