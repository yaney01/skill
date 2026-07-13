#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const themesRoot = path.join(skillRoot, 'assets', 'themes');
const sharedCjkPath = path.join(themesRoot, 'shared', 'cjk.css');

function loadThemes() {
  if (!fs.existsSync(themesRoot)) return new Map();
  if (!fs.existsSync(sharedCjkPath)) throw new Error(`Missing shared CJK theme asset: ${sharedCjkPath}`);
  const themes = new Map();
  for (const entry of fs.readdirSync(themesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'shared') continue;
    const directory = path.join(themesRoot, entry.name);
    const metadataPath = path.join(directory, 'theme.json');
    const previewPath = path.join(directory, 'preview.html');
    const tokenPath = path.join(directory, 'tokens.css');
    const layoutPath = path.join(directory, 'layouts.css');
    if (![metadataPath, previewPath, tokenPath, layoutPath].every((file) => fs.existsSync(file))) continue;
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (!metadata.id || metadata.id !== entry.name) throw new Error(`Theme metadata ID must match its directory: ${entry.name}`);
    themes.set(metadata.id, { directory, metadata, previewPath, tokenPath, layoutPath, metadataPath, cjkPath: sharedCjkPath });
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
  --output <directory>  Output directory. Defaults to ./<deck-name>.
  --force               Overwrite generated files in an existing directory.
  --list-themes         List installed production themes.
  --help                Show this help message.`;
  (exitCode === 0 ? console.log : console.error)(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = { lang: 'zh-CN', force: false, listThemes: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--force') { options.force = true; continue; }
    if (arg === '--list-themes') { options.listThemes = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (!['name', 'title', 'lang', 'theme', 'output'].includes(key)) throw new Error(`Unknown option: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function slugify(value) {
  const slug = value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || 'html-ppt';
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function stripHtml(value = '') {
  return value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

function directoryIsEmpty(directory) {
  return !fs.existsSync(directory) || fs.readdirSync(directory).length === 0;
}

function copyRuntime(outputDirectory) {
  const sourceDirectory = path.join(skillRoot, 'assets', 'runtime');
  const targetDirectory = path.join(outputDirectory, 'runtime');
  const files = ['viewport-base.css', 'deck-runtime.js', 'deck-editor.js'];
  fs.mkdirSync(targetDirectory, { recursive: true });
  for (const file of files) {
    const source = path.join(sourceDirectory, file);
    if (!fs.existsSync(source)) throw new Error(`Missing runtime asset: ${source}`);
    fs.copyFileSync(source, path.join(targetDirectory, file));
  }
}

function copyTheme(theme, outputDirectory) {
  if (!theme) return;
  const targetDirectory = path.join(outputDirectory, 'theme');
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.copyFileSync(theme.tokenPath, path.join(targetDirectory, 'tokens.css'));
  fs.copyFileSync(theme.layoutPath, path.join(targetDirectory, 'layouts.css'));
  fs.copyFileSync(theme.cjkPath, path.join(targetDirectory, 'cjk.css'));
  fs.copyFileSync(theme.metadataPath, path.join(targetDirectory, 'theme.json'));
}

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
    return {
      type: screenshot ? 'product-screenshot' : 'image',
      required,
      status: 'ready',
      source: screenshot ? 'screenshot' : 'supplied',
      role: screenshot ? 'evidence' : 'context',
      ...(slot ? { slot } : {}),
      ...(!/^(?:data:|https?:|\/\/)/i.test(src) ? { path: src } : {}),
      ...(alt ? { alt } : {}),
    };
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
  if (/visual|diagram|system|evidence|grid|column|metric|data-hero/i.test(`${layout} ${body}`)) return { type: 'html-visualization', required, status: 'ready', source: 'html', role: 'explanation' };
  if (/cover|section|statement|quote|closing/i.test(layout)) return { type: /statement|quote/i.test(layout) ? 'intentional-text' : 'typographic', required: false, status: 'ready', source: 'css', role: 'typography' };
  return { type: 'none', required: false, status: 'not-needed', source: 'none', role: 'typography' };
}

function extractSlideManifest(html) {
  const matches = [...html.matchAll(/<section\b([^>]*\bclass\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*)>([\s\S]*?)<\/section>/gi)];
  return matches.map((match, index) => {
    const attrs = match[1];
    const body = match[2];
    const id = attrs.match(/data-slide-id\s*=\s*["']([^"']+)["']/i)?.[1] || `slide-${String(index + 1).padStart(2, '0')}`;
    const layout = attrs.match(/data-layout\s*=\s*["']([^"']+)["']/i)?.[1] || 'unassigned';
    const headline = stripHtml(body.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] || '');
    return {
      id,
      purpose: inferPurpose(layout),
      layout,
      headline,
      visual: inferVisual(`${attrs} ${body}`, layout),
    };
  });
}

function buildProjectReadme({ title, deckId, theme }) {
  const themeLine = theme ? `- \`theme/\` — copied ${theme.metadata.name} theme, including shared CJK typography rules` : '- theme — not assigned; start from the neutral starter';
  return `# ${title}

HTML PPT project generated by the \`ppt\` Agent Skill.

## Files

- \`index.html\` — editable development deck
- \`runtime/\` — fixed-stage player and browser editor
- \`images/\` — local presentation assets
- \`deck.json\` — production manifest, slide map, and visual plan
${themeLine}

## Production order

1. Edit \`deck.json\` before building the full deck. Assign every slide a purpose, layout, and visual decision.
2. Create or frame the required assets in \`images/\`.
3. Build the HTML and mark required visuals ready only when they exist.
4. Run structural, rendered, and visual QA.

## Open

Open \`index.html\` directly in a browser. Press \`E\` to edit text or replace marked images.

## Validate, review, and bundle

From the installed \`ppt\` Skill directory:

\`\`\`bash
node scripts/validate-deck.mjs /absolute/path/to/${deckId}/index.html
node scripts/validate-manifest.mjs /absolute/path/to/${deckId}/deck.json --html /absolute/path/to/${deckId}/index.html
node scripts/qa-deck.mjs /absolute/path/to/${deckId}/index.html --screenshots /absolute/path/to/${deckId}/qa/screenshots
node scripts/qa-visual.mjs /absolute/path/to/${deckId}/index.html --manifest /absolute/path/to/${deckId}/deck.json --json /absolute/path/to/${deckId}/qa/visual-report.json
node scripts/build-contact-sheet.mjs /absolute/path/to/${deckId}/index.html /absolute/path/to/${deckId}/qa/contact-sheet.png
node scripts/bundle-html.mjs /absolute/path/to/${deckId}/index.html /absolute/path/to/${deckId}.html
\`\`\`

The bundled file contains local runtime files, theme CSS, CJK typography rules, and local images as one portable HTML document.
`;
}

function prepareHtml(source, { lang, title, deckId, themed }) {
  let html = fs.readFileSync(source, 'utf8');
  html = html
    .replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(lang)}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/data-deck-id="[^"]+"/i, `data-deck-id="${escapeHtml(deckId)}"`)
    .replaceAll('../../runtime/', 'runtime/')
    .replaceAll('../runtime/', 'runtime/');

  if (themed) {
    html = html
      .replace('href="tokens.css"', 'href="theme/tokens.css"')
      .replace('href="layouts.css"', 'href="theme/layouts.css"')
      .replace('href="../shared/cjk.css"', 'href="theme/cjk.css"');
  }

  const titlePattern = /(<h1\b[^>]*data-role="deck-title"[^>]*>)[\s\S]*?(<\/h1>)/i;
  if (titlePattern.test(html)) html = html.replace(titlePattern, `$1${escapeHtml(title)}$2`);
  else html = html.replace('>A browser-editable deck</h1>', `>${escapeHtml(title)}</h1>`);
  return html;
}

let options;
try { options = parseArgs(process.argv.slice(2)); }
catch (error) { console.error(error.message); usage(2); }

let themes;
try { themes = loadThemes(); }
catch (error) { console.error(error.message); process.exit(1); }

if (options.listThemes) {
  if (themes.size === 0) console.log('No production themes are installed.');
  else for (const [id, theme] of themes) console.log(`${id}\t${theme.metadata.name}\t${theme.metadata.tier || 'core'}\t${theme.metadata.summary}`);
  process.exit(0);
}

if (!options.name) { console.error('--name is required.'); usage(2); }

const theme = options.theme ? themes.get(options.theme) : null;
if (options.theme && !theme) {
  console.error(`Unknown theme: ${options.theme}`);
  console.error(`Available themes: ${[...themes.keys()].join(', ') || 'none'}`);
  process.exit(1);
}

const title = options.title || options.name;
const deckId = slugify(options.name);
const outputDirectory = path.resolve(options.output || path.join(process.cwd(), deckId));

if (!directoryIsEmpty(outputDirectory) && !options.force) {
  console.error(`Output directory is not empty: ${outputDirectory}`);
  console.error('Use --force to overwrite generated files while preserving unrelated files.');
  process.exit(1);
}

const templatePath = theme ? theme.previewPath : path.join(skillRoot, 'assets', 'templates', 'starter.html');
if (!fs.existsSync(templatePath)) { console.error(`Template not found: ${templatePath}`); process.exit(1); }

fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(path.join(outputDirectory, 'images'), { recursive: true });
copyRuntime(outputDirectory);
copyTheme(theme, outputDirectory);

const html = prepareHtml(templatePath, { lang: options.lang, title, deckId, themed: Boolean(theme) });
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
  visualStrategy: {
    mode: 'mixed',
    targetCoverage: 0.5,
    targetEvidenceCoverage: 0.3,
    maxConsecutiveTextOnly: 2,
  },
  slides: extractSlideManifest(html),
  createdAt: new Date().toISOString(),
  generator: 'html-ppt-agent-skill',
};

fs.writeFileSync(path.join(outputDirectory, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'deck.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'README.md'), buildProjectReadme({ title, deckId, theme }), 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'images', '.gitkeep'), '', 'utf8');

console.log(`Created HTML PPT project: ${outputDirectory}`);
console.log(`Deck ID: ${deckId}`);
console.log(`Theme: ${theme?.metadata.id || 'unassigned'}`);
console.log(`Manifest slides: ${metadata.slides.length}`);
console.log('Next: complete the visual plan in deck.json before authoring the full deck.');
