#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildVisualWorkOrders, writeVisualWorkOrders } from './lib/visual-work-orders.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const themesRoot = path.join(skillRoot, 'assets', 'themes');
const sharedCjkPath = path.join(themesRoot, 'shared', 'cjk.css');
const sharedLayoutContractsPath = path.join(themesRoot, 'shared', 'layout-contracts.json');
const sourceImporterPath = path.join(scriptDir, 'ingest-source.py');
const sourceValidatorPath = path.join(scriptDir, 'validate-source.mjs');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function loadThemes() {
  if (!fs.existsSync(themesRoot)) return new Map();
  for (const required of [sharedCjkPath, sharedLayoutContractsPath]) {
    if (!fs.existsSync(required)) throw new Error(`Missing shared theme asset: ${required}`);
  }
  const themes = new Map();
  for (const entry of fs.readdirSync(themesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'shared') continue;
    const directory = path.join(themesRoot, entry.name);
    const files = {
      metadataPath: path.join(directory, 'theme.json'),
      previewPath: path.join(directory, 'preview.html'),
      tokenPath: path.join(directory, 'tokens.css'),
      layoutPath: path.join(directory, 'layouts.css'),
      layoutManifestPath: path.join(directory, 'layout-manifest.json'),
    };
    if (!Object.values(files).every((file) => fs.existsSync(file))) continue;
    const metadata = readJson(files.metadataPath);
    const layoutManifest = readJson(files.layoutManifestPath);
    if (!metadata.id || metadata.id !== entry.name) throw new Error(`Theme metadata ID must match its directory: ${entry.name}`);
    if (layoutManifest.theme !== metadata.id) throw new Error(`Layout manifest theme must match ${metadata.id}`);
    themes.set(metadata.id, {
      directory,
      metadata,
      layoutManifest,
      cjkPath: sharedCjkPath,
      layoutContractsPath: sharedLayoutContractsPath,
      ...files,
    });
  }
  return themes;
}

function usage(exitCode = 0) {
  const text = `Usage:
  node scripts/create-deck.mjs --name <deck-name> [options]
  node scripts/create-deck.mjs --list-themes

Options:
  --title <title>       Presentation title. Defaults to the name.
  --lang <language>     HTML language tag. Defaults to zh-CN.
  --theme <theme-id>    Use an installed production theme.
  --source <file>       Normalize PPTX, DOCX, PDF, or Markdown into project/source.
  --preserve-layout     Preserve source geometry and forbid merge/condense/omit.
  --allow-omit          Permit justified source omissions during semantic redesign.
  --strict-source       Treat source-import warnings as validation failures.
  --output <directory>  Output directory. Defaults to ./<deck-name>.
  --force               Overwrite generated files in an existing directory.
  --list-themes         List installed production themes.
  --help                Show this help message.`;
  (exitCode === 0 ? console.log : console.error)(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = { lang: 'zh-CN', force: false, listThemes: false, preserveLayout: false, allowOmit: false, strictSource: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--force') { options.force = true; continue; }
    if (arg === '--list-themes') { options.listThemes = true; continue; }
    if (arg === '--preserve-layout') { options.preserveLayout = true; continue; }
    if (arg === '--allow-omit') { options.allowOmit = true; continue; }
    if (arg === '--strict-source') { options.strictSource = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (!['name', 'title', 'lang', 'theme', 'source', 'output'].includes(key)) throw new Error(`Unknown option: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function slugify(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'html-ppt';
}
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function stripHtml(value = '') {
  return value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}
function directoryIsEmpty(directory) { return !fs.existsSync(directory) || fs.readdirSync(directory).length === 0; }

function copyRuntime(outputDirectory) {
  const target = path.join(outputDirectory, 'runtime');
  fs.mkdirSync(target, { recursive: true });
  for (const file of ['viewport-base.css', 'deck-runtime.js', 'deck-editor.js']) {
    const source = path.join(skillRoot, 'assets', 'runtime', file);
    if (!fs.existsSync(source)) throw new Error(`Missing runtime asset: ${source}`);
    fs.copyFileSync(source, path.join(target, file));
  }
}

function copyTheme(theme, outputDirectory) {
  if (!theme) return;
  const target = path.join(outputDirectory, 'theme');
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(theme.tokenPath, path.join(target, 'tokens.css'));
  fs.copyFileSync(theme.layoutPath, path.join(target, 'layouts.css'));
  fs.copyFileSync(theme.cjkPath, path.join(target, 'cjk.css'));
  fs.copyFileSync(theme.metadataPath, path.join(target, 'theme.json'));
  fs.copyFileSync(theme.layoutContractsPath, path.join(target, 'layout-contracts.json'));
  fs.writeFileSync(path.join(target, 'layout-manifest.json'), `${JSON.stringify({ ...theme.layoutManifest, contracts: 'layout-contracts.json' }, null, 2)}\n`, 'utf8');
}

function runChecked(command, args, label) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${label} failed${details ? `:\n${details}` : '.'}`);
  }
  return result;
}

function prepareSource(options) {
  if (!options.source) return null;
  const sourcePath = path.resolve(options.source);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error(`Source file not found: ${sourcePath}`);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'html-ppt-source-'));
  const sourceDirectory = path.join(tempRoot, 'source');
  try {
    const importArgs = [sourceImporterPath, sourcePath, '--output', sourceDirectory];
    if (options.preserveLayout) importArgs.push('--preserve-layout');
    if (options.allowOmit) importArgs.push('--allow-omit');
    runChecked(process.env.PYTHON || 'python3', importArgs, 'Source ingestion');
    const manifestPath = path.join(sourceDirectory, 'manifest.json');
    const validateArgs = [sourceValidatorPath, manifestPath, '--source', sourcePath];
    if (options.strictSource) validateArgs.push('--strict');
    runChecked(process.execPath, validateArgs, 'Source validation');
    return {
      tempRoot,
      directory: sourceDirectory,
      manifest: readJson(manifestPath),
      originalPath: sourcePath,
      mode: options.preserveLayout ? 'preserve-layout' : 'semantic',
    };
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function installPreparedSource(sourceInfo, outputDirectory) {
  if (!sourceInfo) return;
  const target = path.join(outputDirectory, 'source');
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(sourceInfo.directory, target, { recursive: true });
  const readmePath = path.join(target, 'README.md');
  if (fs.existsSync(readmePath)) fs.writeFileSync(readmePath, fs.readFileSync(readmePath, 'utf8').replaceAll(sourceInfo.directory, target), 'utf8');
}

function canonicalLayout(layout, theme) { return theme?.layoutManifest?.legacyAliases?.[layout] || layout; }
function inferPurpose(layout) {
  if (/cover/i.test(layout)) return 'hook';
  if (/section/i.test(layout)) return 'section-reset';
  if (/statement|quote/i.test(layout)) return 'key-claim';
  if (/comparison/i.test(layout)) return 'compare';
  if (/process|workflow|system|timeline/i.test(layout)) return 'explain';
  if (/closing/i.test(layout)) return 'close';
  return 'content';
}
function inferVisual(body, layout) {
  const declared = body.match(/data-visual-type\s*=\s*["']([^"']+)["']/i)?.[1];
  const required = /data-visual-required\s*=\s*["']true["']/i.test(body);
  const image = body.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i);
  const alt = image?.[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  const slot = image?.[0].match(/data-image-slot\s*=\s*["']([^"']+)["']/i)?.[1] || undefined;
  if (image) {
    const src = image[1];
    const screenshot = /screenshot|dashboard|ui|界面|截图/i.test(`${layout} ${alt} ${body.slice(0, 500)}`);
    return { type: screenshot ? 'product-screenshot' : 'image', required, status: 'ready', source: screenshot ? 'screenshot' : 'supplied', role: screenshot ? 'evidence' : 'context', ...(slot ? { slot } : {}), ...(!/^(?:data:|https?:|\/\/)/i.test(src) ? { path: src } : {}), ...(alt ? { alt } : {}) };
  }
  if (declared) {
    const source = /chart/i.test(declared) ? 'chart' : /diagram|timeline|comparison|visualization/i.test(declared) ? 'html' : 'css';
    const role = /comparison/i.test(declared) ? 'comparison' : /typographic|intentional-text/i.test(declared) ? 'typography' : 'explanation';
    return { type: declared, required, status: 'ready', source, role };
  }
  if (/<svg\b/i.test(body)) return { type: /workflow|process/i.test(layout) ? 'workflow-diagram' : 'system-diagram', required, status: 'ready', source: 'svg', role: 'explanation' };
  if (/timeline/i.test(layout)) return { type: 'timeline', required, status: 'ready', source: 'html', role: 'explanation' };
  if (/comparison/i.test(layout)) return { type: 'comparison-diagram', required, status: 'ready', source: 'html', role: 'comparison' };
  if (/process|workflow/i.test(layout)) return { type: 'workflow-diagram', required, status: 'ready', source: 'html', role: 'explanation' };
  if (/chart/i.test(layout)) return { type: 'data-chart', required, status: 'ready', source: 'chart', role: 'evidence' };
  if (/visual|diagram|system|evidence|grid|three-up|four-grid|metric|data-hero/i.test(`${layout} ${body}`)) return { type: 'html-visualization', required, status: 'ready', source: 'html', role: 'explanation' };
  if (/cover|section|statement|quote|closing/i.test(layout)) return { type: /statement|quote/i.test(layout) ? 'intentional-text' : 'typographic', required: false, status: 'ready', source: 'css', role: 'typography' };
  return { type: 'none', required: false, status: 'not-needed', source: 'none', role: 'typography' };
}
function extractSlideManifest(html, theme) {
  const matches = [...html.matchAll(/<section\b([^>]*\bclass\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*)>([\s\S]*?)<\/section>/gi)];
  return matches.map((match, index) => {
    const attrs = match[1];
    const body = match[2];
    const id = attrs.match(/data-slide-id\s*=\s*["']([^"']+)["']/i)?.[1] || `slide-${String(index + 1).padStart(2, '0')}`;
    const rawLayout = attrs.match(/data-layout\s*=\s*["']([^"']+)["']/i)?.[1] || 'unassigned';
    const layout = canonicalLayout(rawLayout, theme);
    const headline = stripHtml(body.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] || '');
    return { id, purpose: inferPurpose(layout), layout, headline, visual: inferVisual(`${attrs} ${body}`, layout) };
  });
}

function buildProjectReadme({ title, deckId, theme, sourceInfo }) {
  const themeLine = theme ? `- \`theme/\` — copied ${theme.metadata.name}, registered layouts, and shared CJK rules` : '- theme — not assigned; start from the neutral starter';
  const sourceLine = sourceInfo ? `- \`source/\` — standardized ${sourceInfo.manifest.source.type.toUpperCase()} source, assets, provenance, and preservation rules` : '- source — not assigned';
  const sourceSteps = sourceInfo ? `1. Review \`source/manifest.json\` and importer warnings.\n2. Complete \`deck.json.source.mapping\`.\n3.` : '1.';
  const next = sourceInfo ? 4 : 2;
  return `# ${title}

HTML PPT project generated by the \`ppt\` Agent Skill.

## Files

- \`index.html\` — editable development deck
- \`runtime/\` — fixed-stage player and browser editor
- \`images/\` — local presentation assets
- \`deck.json\` — source mapping, registered layouts, slide map, and synchronized visual plan
- \`qa/visual-work-orders.json\` — executable per-slide visual production queue
- \`qa/visual-work-orders.md\` — human-readable production handoff
${sourceLine}
${themeLine}

## Production order

${sourceSteps} Select layouts from \`theme/layout-manifest.json\`; do not invent an unregistered layout before extending the registry.
${next}. Edit \`deck.json\` and assign every slide a purpose, registered layout, visual decision, and source provenance.
${next + 1}. Review and fulfill \`qa/visual-work-orders.json\` and \`qa/visual-work-orders.md\`.
${next + 2}. Synchronize completed work orders into \`deck.json\`.
${next + 3}. Run source, layout, structural, delivery-manifest, work-order, rendered, and visual QA.

## Validate

\`\`\`bash
${sourceInfo ? `node scripts/validate-source.mjs /absolute/path/to/${deckId}/source/manifest.json --source ${JSON.stringify(sourceInfo.originalPath)}\n` : ''}${theme ? `node scripts/validate-layouts.mjs --theme ${theme.metadata.id} --strict\n` : ''}node scripts/validate-deck.mjs /absolute/path/to/${deckId}/index.html
node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html --stage delivery --strict
node scripts/validate-visual-work-orders.mjs /absolute/path/to/${deckId}/qa/visual-work-orders.json --deck /absolute/path/to/${deckId}/deck.json --stage delivery --strict
node scripts/qa-deck.mjs /absolute/path/to/${deckId}/index.html --screenshots /absolute/path/to/${deckId}/qa/screenshots
node scripts/qa-visual.mjs /absolute/path/to/${deckId}/index.html --manifest /absolute/path/to/${deckId}/deck.json
node scripts/bundle-html.mjs /absolute/path/to/${deckId}/index.html /absolute/path/to/${deckId}.html
\`\`\`
`;
}

function prepareHtml(source, { lang, title, deckId, theme }) {
  let html = fs.readFileSync(source, 'utf8')
    .replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(lang)}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/data-deck-id="[^"]+"/i, `data-deck-id="${escapeHtml(deckId)}"`)
    .replaceAll('../../runtime/', 'runtime/')
    .replaceAll('../runtime/', 'runtime/');
  if (theme) {
    html = html.replace('href="tokens.css"', 'href="theme/tokens.css"').replace('href="layouts.css"', 'href="theme/layouts.css"').replace('href="../shared/cjk.css"', 'href="theme/cjk.css"');
    for (const [alias, canonical] of Object.entries(theme.layoutManifest.legacyAliases || {})) {
      html = html.replace(new RegExp(`data-layout=(["'])${escapeRegExp(alias)}\\1`, 'g'), `data-layout="${canonical}"`);
    }
  }
  const titlePattern = /(<h1\b[^>]*data-role="deck-title"[^>]*>)[\s\S]*?(<\/h1>)/i;
  return titlePattern.test(html) ? html.replace(titlePattern, `$1${escapeHtml(title)}$2`) : html.replace('>A browser-editable deck</h1>', `>${escapeHtml(title)}</h1>`);
}

let options;
try { options = parseArgs(process.argv.slice(2)); }
catch (error) { console.error(error.message); usage(2); }
let themes;
try { themes = loadThemes(); }
catch (error) { console.error(error.message); process.exit(1); }
if (options.listThemes) {
  if (!themes.size) console.log('No production themes are installed.');
  else for (const [id, theme] of themes) console.log(`${id}\t${theme.metadata.name}\t${theme.metadata.tier || 'core'}\t${theme.layoutManifest.layouts.length} layouts\t${theme.metadata.summary}`);
  process.exit(0);
}
if (!options.name) { console.error('--name is required.'); usage(2); }
if (!options.source && (options.preserveLayout || options.allowOmit || options.strictSource)) { console.error('--preserve-layout, --allow-omit, and --strict-source require --source.'); usage(2); }
if (options.preserveLayout && options.allowOmit) { console.error('--preserve-layout and --allow-omit express conflicting source policies.'); usage(2); }
const theme = options.theme ? themes.get(options.theme) : null;
if (options.theme && !theme) { console.error(`Unknown theme: ${options.theme}`); console.error(`Available themes: ${[...themes.keys()].join(', ') || 'none'}`); process.exit(1); }
const title = options.title || options.name;
const deckId = slugify(options.name);
const outputDirectory = path.resolve(options.output || path.join(process.cwd(), deckId));
if (!directoryIsEmpty(outputDirectory) && !options.force) { console.error(`Output directory is not empty: ${outputDirectory}`); console.error('Use --force to overwrite generated files while preserving unrelated files.'); process.exit(1); }
const templatePath = theme ? theme.previewPath : path.join(skillRoot, 'assets', 'templates', 'starter.html');
if (!fs.existsSync(templatePath)) { console.error(`Template not found: ${templatePath}`); process.exit(1); }
let sourceInfo = null;
try { sourceInfo = prepareSource(options); }
catch (error) { console.error(error.message); process.exit(1); }
try {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.mkdirSync(path.join(outputDirectory, 'images'), { recursive: true });
  copyRuntime(outputDirectory);
  copyTheme(theme, outputDirectory);
  installPreparedSource(sourceInfo, outputDirectory);
  const html = prepareHtml(templatePath, { lang: options.lang, title, deckId, theme });
  const metadata = {
    $schema: 'https://github.com/yaney01/skill/blob/main/ppt/schemas/deck.schema.json',
    manifestVersion: 2,
    id: deckId,
    title,
    language: options.lang,
    density: 'speaker-led',
    style: theme?.metadata.id || 'unassigned',
    themeName: theme?.metadata.name || null,
    themeTier: theme?.metadata.tier || null,
    ...(theme ? { layoutRegistry: 'theme/layout-manifest.json' } : {}),
    ...(sourceInfo ? { source: { manifest: 'source/manifest.json', originalFile: sourceInfo.manifest.source.fileName, type: sourceInfo.manifest.source.type, mode: sourceInfo.mode, mapping: [] } } : {}),
    visualStrategy: { mode: 'mixed', targetCoverage: 0.5, targetEvidenceCoverage: 0.3, maxConsecutiveTextOnly: 2 },
    slides: extractSlideManifest(html, theme),
    createdAt: new Date().toISOString(),
    generator: 'html-ppt-agent-skill',
  };
  const deckPath = path.join(outputDirectory, 'deck.json');
  fs.writeFileSync(path.join(outputDirectory, 'index.html'), html, 'utf8');
  fs.writeFileSync(deckPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  const visualPlan = buildVisualWorkOrders(metadata, { stage: 'planning' });
  writeVisualWorkOrders(visualPlan, {
    jsonPath: path.join(outputDirectory, 'qa', 'visual-work-orders.json'),
    markdownPath: path.join(outputDirectory, 'qa', 'visual-work-orders.md'),
    manifestPath: deckPath,
    force: true,
  });
  fs.writeFileSync(path.join(outputDirectory, 'README.md'), buildProjectReadme({ title, deckId, theme, sourceInfo }), 'utf8');
  fs.writeFileSync(path.join(outputDirectory, 'images', '.gitkeep'), '', 'utf8');
  console.log(`Created HTML PPT project: ${outputDirectory}`);
  console.log(`Deck ID: ${deckId}`);
  console.log(`Theme: ${theme?.metadata.id || 'unassigned'}`);
  if (theme) console.log(`Registered layouts: ${theme.layoutManifest.layouts.length}`);
  if (sourceInfo) { console.log(`Source: ${sourceInfo.manifest.source.type} — ${sourceInfo.manifest.pageCount} pages/sections`); console.log(`Source mode: ${sourceInfo.mode}`); }
  console.log(`Manifest slides: ${metadata.slides.length}`);
  console.log('Visual work orders: qa/visual-work-orders.json and qa/visual-work-orders.md');
  console.log(sourceInfo ? 'Next: review source/manifest.json, complete deck.json.source.mapping, then update the visual work orders.' : 'Next: select registered layouts and update the visual work orders before production.');
} finally {
  if (sourceInfo?.tempRoot) fs.rmSync(sourceInfo.tempRoot, { recursive: true, force: true });
}
