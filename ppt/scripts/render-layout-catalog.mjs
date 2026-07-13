#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const themesRoot = path.join(skillRoot, 'assets', 'themes');
const runtimeRoot = path.join(skillRoot, 'assets', 'runtime');
const sharedCjk = path.join(themesRoot, 'shared', 'cjk.css');

function usage(code = 0) {
  const text = `Usage:
  node scripts/render-layout-catalog.mjs --theme <theme-id> --output <directory> [--force]

Creates a standalone development project containing one slide per registered layout.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) usage(2);
  return value;
}
const themeId = option('--theme');
const outputOption = option('--output');
const force = args.includes('--force');
if (!themeId || !outputOption) usage(2);

const themeDirectory = path.join(themesRoot, themeId);
const files = {
  metadata: path.join(themeDirectory, 'theme.json'),
  manifest: path.join(themeDirectory, 'layout-manifest.json'),
  contracts: path.join(themesRoot, 'shared', 'layout-contracts.json'),
  tokens: path.join(themeDirectory, 'tokens.css'),
  layouts: path.join(themeDirectory, 'layouts.css'),
  preview: path.join(themeDirectory, 'preview.html'),
};
for (const [kind, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${kind}: ${file}`);
    process.exit(2);
  }
}

const metadata = JSON.parse(fs.readFileSync(files.metadata, 'utf8'));
const registry = JSON.parse(fs.readFileSync(files.manifest, 'utf8'));
const contracts = JSON.parse(fs.readFileSync(files.contracts, 'utf8'));
const preview = fs.readFileSync(files.preview, 'utf8');
const outputDirectory = path.resolve(outputOption);
if (fs.existsSync(outputDirectory) && fs.readdirSync(outputDirectory).length && !force) {
  console.error(`Output directory is not empty: ${outputDirectory}`);
  console.error('Use --force to replace generated catalog files.');
  process.exit(1);
}
fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(path.join(outputDirectory, 'runtime'), { recursive: true });
fs.mkdirSync(path.join(outputDirectory, 'theme'), { recursive: true });
for (const file of ['viewport-base.css', 'deck-runtime.js', 'deck-editor.js']) {
  fs.copyFileSync(path.join(runtimeRoot, file), path.join(outputDirectory, 'runtime', file));
}
fs.copyFileSync(files.tokens, path.join(outputDirectory, 'theme', 'tokens.css'));
fs.copyFileSync(files.layouts, path.join(outputDirectory, 'theme', 'layouts.css'));
fs.copyFileSync(sharedCjk, path.join(outputDirectory, 'theme', 'cjk.css'));
fs.copyFileSync(files.metadata, path.join(outputDirectory, 'theme', 'theme.json'));
fs.copyFileSync(files.contracts, path.join(outputDirectory, 'theme', 'layout-contracts.json'));
const portableRegistry = { ...registry, contracts: 'layout-contracts.json' };
fs.writeFileSync(path.join(outputDirectory, 'theme', 'layout-manifest.json'), `${JSON.stringify(portableRegistry, null, 2)}\n`, 'utf8');

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function previewBodies(html) {
  const bodies = new Map();
  const pattern = /<section\b([^>]*\bclass\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*)>([\s\S]*?)<\/section>/gi;
  for (const match of html.matchAll(pattern)) {
    const layout = match[1].match(/data-layout\s*=\s*["']([^"']+)["']/i)?.[1];
    if (layout) bodies.set(layout, match[2].trim());
  }
  return bodies;
}
const existingBodies = previewBodies(preview);
for (const [alias, canonical] of Object.entries(registry.legacyAliases || {})) {
  if (!existingBodies.has(canonical) && existingBodies.has(alias)) existingBodies.set(canonical, existingBodies.get(alias));
}

function header(id, title) {
  return `<div class="theme-kicker">REGISTERED LAYOUT / ${escapeHtml(id.toUpperCase())}</div><h2 class="theme-title" data-editable="text" data-element-id="catalog-${id}-title">${escapeHtml(title)}</h2>`;
}
function commonBody(id, title, index, total) {
  const folio = `<div class="theme-folio">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
  if (id === 'image-focus') return `<div class="theme-canvas"><div class="theme-image-focus">${header(id, title)}<div class="theme-image-focus__media" data-visual-type="html-visualization" data-visual-role="evidence" aria-label="Registered image-focus placeholder"></div><div class="theme-image-focus__caption"><span>视觉证据占据页面主导位置。</span><span>槽位：16:9</span></div></div>${folio}</div>`;
  if (id === 'four-grid') return `<div class="theme-canvas">${header(id, title)}<div class="theme-four-grid" data-visual-type="html-visualization">${['对象','方法','证据','行动'].map((label, i) => `<article class="theme-tile"><div class="theme-tile__num">0${i + 1}</div><div><h3>${label}</h3><p>每个单元承担平行且可比较的信息职责。</p></div></article>`).join('')}</div>${folio}</div>`;
  if (id === 'metrics') return `<div class="theme-canvas">${header(id, title)}<div class="theme-metrics" data-visual-type="html-visualization" data-visual-role="evidence">${[['覆盖率','68%','较上期 +12pp'],['周期','4.2d','端到端交付'],['复用率','3.6×','同一资产多端适配']].map(([label,value,note]) => `<article class="theme-metric"><div class="theme-metric__label">${label}</div><strong>${value}</strong><span>${note}</span></article>`).join('')}</div>${folio}</div>`;
  if (id === 'comparison') return `<div class="theme-canvas">${header(id, title)}<div class="theme-comparison" data-visual-type="comparison-diagram" data-visual-role="comparison"><article class="theme-comparison__side"><h3>旧方式</h3><ul><li>单点生成</li><li>上下文重复输入</li><li>质量依赖人工补救</li><li>交付不可审计</li></ul></article><div class="theme-comparison__axis">VS</div><article class="theme-comparison__side"><h3>系统方式</h3><ul><li>先规划再生产</li><li>来源和视觉均有合同</li><li>机械与语义 QA 分离</li><li>结果可追溯、可复用</li></ul></article></div>${folio}</div>`;
  if (id === 'timeline') return `<div class="theme-canvas">${header(id, title)}<div class="theme-timeline" data-visual-type="timeline" data-visual-role="explanation">${[['W1','审计','识别生产缺口'],['W2','规划','建立内容与视觉合同'],['W3','生产','完成代表页面'],['W4','验证','机械与语义 QA'],['W5','交付','打包与复盘']].map(([time,name,note]) => `<article class="theme-timeline__item"><time>${time}</time><h3>${name}</h3><p>${note}</p></article>`).join('')}</div>${folio}</div>`;
  if (id === 'process') return `<div class="theme-canvas">${header(id, title)}<div class="theme-process" data-visual-type="workflow-diagram" data-visual-role="explanation">${[['01','输入','标准化来源'],['02','映射','建立叙事关系'],['03','计划','分配布局与视觉'],['04','生产','生成页面与素材'],['05','验收','验证并打包']].map(([num,name,note]) => `<article class="theme-process__step"><strong>${num}</strong><h3>${name}</h3><p>${note}</p></article>`).join('')}</div>${folio}</div>`;
  if (id === 'chart') return `<div class="theme-canvas">${header(id, title)}<div class="theme-chart" data-visual-type="data-chart" data-visual-role="evidence"><div class="theme-chart__copy"><div class="theme-kicker">CONCLUSION</div><strong>视觉完整度持续提升</strong><p class="theme-lead">用结论标题、单位和来源解释图表，而不是只展示柱形。</p></div><div class="theme-chart__plot" aria-label="Quarterly visual coverage bar chart">${[['Q1','34%'],['Q2','49%'],['Q3','68%'],['Q4','81%']].map(([label,value]) => `<div class="theme-bar" style="--value:${value}"><span>${label}</span></div>`).join('')}</div></div>${folio}</div>`;
  if (id === 'quote') return `<div class="theme-canvas"><div class="theme-quote"><div class="theme-quote__mark">“</div><div><blockquote class="theme-quote__text" data-editable="text" data-element-id="catalog-quote-text">布局不是风格标签，而是可选择、可复用、可验证的生产组件。</blockquote><div class="theme-quote__source">布局注册原则 / HTML PPT Skill</div></div></div>${folio}</div>`;
  throw new Error(`No catalog sample exists for layout: ${id}`);
}

function visualFor(id) {
  if (id === 'image-focus') return { type: 'html-visualization', required: true, status: 'ready', source: 'html', role: 'evidence' };
  if (id === 'metrics' || id === 'four-grid' || id === 'three-up') return { type: 'html-visualization', required: id === 'metrics', status: 'ready', source: 'html', role: id === 'metrics' ? 'evidence' : 'explanation' };
  if (id === 'comparison') return { type: 'comparison-diagram', required: true, status: 'ready', source: 'html', role: 'comparison' };
  if (id === 'timeline') return { type: 'timeline', required: true, status: 'ready', source: 'html', role: 'explanation' };
  if (id === 'process' || id === 'split') return { type: 'workflow-diagram', required: true, status: 'ready', source: 'html', role: 'explanation' };
  if (id === 'chart') return { type: 'data-chart', required: true, status: 'ready', source: 'chart', role: 'evidence' };
  if (id === 'statement' || id === 'quote') return { type: 'intentional-text', required: false, status: 'ready', source: 'css', role: 'typography' };
  if (id === 'cover' || id === 'section' || id === 'closing') return { type: 'typographic', required: false, status: 'ready', source: 'css', role: 'typography' };
  return { type: 'html-visualization', required: false, status: 'ready', source: 'html', role: 'explanation' };
}

const registered = registry.layouts.map((item) => item.id);
const slides = registry.layouts.map((item, index) => {
  const contract = contracts.layouts[item.id];
  const body = existingBodies.get(item.id) || commonBody(item.id, contract.name, index, registry.layouts.length);
  return {
    html: `<section class="slide${index === 0 ? ' active visible' : ''}" data-slide-id="slide-${String(index + 1).padStart(2, '0')}" data-layout="${escapeHtml(item.id)}">${body}</section>`,
    manifest: {
      id: `slide-${String(index + 1).padStart(2, '0')}`,
      purpose: contract.purpose,
      layout: item.id,
      headline: `${metadata.name} / ${contract.name}`,
      visual: visualFor(item.id),
    },
  };
});

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metadata.name)} Layout Catalog</title>
  <link rel="stylesheet" href="runtime/viewport-base.css">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/layouts.css">
  <link rel="stylesheet" href="theme/cjk.css">
</head>
<body>
  <div class="deck-viewport"><main class="deck-stage" id="deckStage" data-deck-id="${escapeHtml(themeId)}-layout-catalog">${slides.map((slide) => slide.html).join('\n')}</main></div>
  <script src="runtime/deck-runtime.js" defer></script>
  <script src="runtime/deck-editor.js" defer></script>
</body>
</html>`;

const deck = {
  $schema: 'https://github.com/yaney01/skill/blob/main/ppt/schemas/deck.schema.json',
  manifestVersion: 2,
  id: `${themeId}-layout-catalog`,
  title: `${metadata.name} Layout Catalog`,
  language: 'zh-CN',
  density: 'speaker-led',
  style: themeId,
  themeName: metadata.name,
  themeTier: metadata.tier || 'core',
  layoutRegistry: 'theme/layout-manifest.json',
  visualStrategy: { mode: 'mixed', targetCoverage: 0.7, targetEvidenceCoverage: 0.35, maxConsecutiveTextOnly: 2 },
  slides: slides.map((slide) => slide.manifest),
  createdAt: new Date().toISOString(),
  generator: 'html-ppt-layout-catalog',
};
fs.writeFileSync(path.join(outputDirectory, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'deck.json'), `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'README.md'), `# ${metadata.name} layout catalog\n\nRegistered layouts: ${registered.join(', ')}.\n`, 'utf8');
console.log(`Created layout catalog: ${outputDirectory}`);
console.log(`Theme: ${themeId}`);
console.log(`Layouts: ${registered.length}`);
