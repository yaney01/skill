#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage(exitCode = 0) {
  const text = `Usage:
  node scripts/bundle-html.mjs <input.html> [output.html]

Bundles local stylesheets, scripts, images, fonts, media, and CSS url() assets into one HTML file.
Remote URLs are preserved and reported because this tool does not download network resources.
`;
  (exitCode === 0 ? console.log : console.error)(text.trim());
  process.exit(exitCode);
}

const [inputArg, outputArg, ...extra] = process.argv.slice(2);
if (!inputArg || extra.length > 0 || inputArg === '--help' || inputArg === '-h') usage(inputArg ? 0 : 2);

const input = path.resolve(inputArg);
if (!fs.existsSync(input) || !fs.statSync(input).isFile()) {
  console.error(`Input file not found: ${input}`);
  process.exit(2);
}

const inputDirectory = path.dirname(input);
const extension = path.extname(input);
const defaultOutput = path.join(
  inputDirectory,
  `${path.basename(input, extension)}.bundled${extension || '.html'}`
);
const output = path.resolve(outputArg || defaultOutput);
if (output === input) {
  console.error('Output must not overwrite the source HTML.');
  process.exit(2);
}

const stats = { stylesheets: 0, scripts: 0, assets: 0 };
const remoteReferences = new Set();

const mimeTypes = new Map([
  ['.avif', 'image/avif'], ['.bmp', 'image/bmp'], ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'], ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'], ['.otf', 'font/otf'],
  ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'], ['.wav', 'audio/wav'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
  ['.json', 'application/json'], ['.pdf', 'application/pdf']
]);

function isRemote(reference) {
  return /^(?:https?:)?\/\//i.test(reference);
}

function isEmbeddedOrFragment(reference) {
  return /^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(reference);
}

function splitReference(reference) {
  const match = reference.match(/^([^?#]*)([?#].*)?$/);
  return { pathname: match?.[1] || reference, suffix: match?.[2] || '' };
}

function resolveLocal(reference, baseDirectory) {
  const decoded = decodeURIComponent(splitReference(reference).pathname);
  if (decoded.startsWith('file://')) return new URL(decoded).pathname;
  return path.resolve(baseDirectory, decoded);
}

function toDataUri(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Referenced local asset does not exist: ${filePath}`);
  }
  const extension = path.extname(filePath).toLowerCase();
  const mime = mimeTypes.get(extension) || 'application/octet-stream';
  const data = fs.readFileSync(filePath).toString('base64');
  stats.assets += 1;
  return `data:${mime};base64,${data}`;
}

async function replaceAsync(inputText, pattern, replacer) {
  const matches = [...inputText.matchAll(pattern)];
  if (matches.length === 0) return inputText;
  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let cursor = 0;
  let result = '';
  matches.forEach((match, index) => {
    result += inputText.slice(cursor, match.index) + replacements[index];
    cursor = match.index + match[0].length;
  });
  return result + inputText.slice(cursor);
}

async function embedReference(reference, baseDirectory) {
  const trimmed = reference.trim();
  if (!trimmed || isEmbeddedOrFragment(trimmed)) return reference;
  if (isRemote(trimmed)) {
    remoteReferences.add(trimmed);
    return reference;
  }
  return toDataUri(resolveLocal(trimmed, baseDirectory));
}

async function embedCssUrls(css, baseDirectory) {
  return replaceAsync(
    css,
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    async (full, quote, reference) => {
      const embedded = await embedReference(reference, baseDirectory);
      return `url("${embedded.replaceAll('"', '%22')}")`;
    }
  );
}

function escapeStyleContent(value) {
  return value.replace(/<\/style/gi, '<\\/style');
}

function escapeScriptContent(value) {
  return value.replace(/<\/script/gi, '<\\/script');
}

let html = fs.readFileSync(input, 'utf8');

html = await replaceAsync(
  html,
  /<link\b([^>]*\brel\s*=\s*(["'])stylesheet\2[^>]*)>/gi,
  async (full, attributes) => {
    const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!href || isEmbeddedOrFragment(href)) return full;
    if (isRemote(href)) {
      remoteReferences.add(href);
      return full;
    }
    const stylesheetPath = resolveLocal(href, inputDirectory);
    if (!fs.existsSync(stylesheetPath)) throw new Error(`Stylesheet not found: ${stylesheetPath}`);
    const css = await embedCssUrls(fs.readFileSync(stylesheetPath, 'utf8'), path.dirname(stylesheetPath));
    stats.stylesheets += 1;
    return `<style data-bundled-from="${href.replaceAll('"', '&quot;')}">\n${escapeStyleContent(css)}\n</style>`;
  }
);

html = await replaceAsync(
  html,
  /<script\b([^>]*\bsrc\s*=\s*(["'])(.*?)\2[^>]*)>\s*<\/script>/gi,
  async (full, attributes, quote, source) => {
    if (isEmbeddedOrFragment(source)) return full;
    if (isRemote(source)) {
      remoteReferences.add(source);
      return full;
    }
    const scriptPath = resolveLocal(source, inputDirectory);
    if (!fs.existsSync(scriptPath)) throw new Error(`Script not found: ${scriptPath}`);
    const code = fs.readFileSync(scriptPath, 'utf8');
    const cleanedAttributes = attributes
      .replace(/\s*src\s*=\s*(["']).*?\1/i, '')
      .replace(/\s*defer\b/i, '')
      .trim();
    stats.scripts += 1;
    return `<script${cleanedAttributes ? ` ${cleanedAttributes}` : ''} data-bundled-from="${source.replaceAll('"', '&quot;')}">\n${escapeScriptContent(code)}\n</script>`;
  }
);

html = await replaceAsync(
  html,
  /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
  async (full, attributes, css) => `<style${attributes}>${escapeStyleContent(await embedCssUrls(css, inputDirectory))}</style>`
);

html = await replaceAsync(
  html,
  /\b(src|poster)\s*=\s*(["'])(.*?)\2/gi,
  async (full, attribute, quote, reference) => `${attribute}=${quote}${await embedReference(reference, inputDirectory)}${quote}`
);

html = await replaceAsync(
  html,
  /\bsrcset\s*=\s*(["'])(.*?)\1/gi,
  async (full, quote, value) => {
    const candidates = value.split(',').map((candidate) => candidate.trim()).filter(Boolean);
    const bundled = [];
    for (const candidate of candidates) {
      const parts = candidate.split(/\s+/);
      const reference = parts.shift();
      bundled.push([await embedReference(reference, inputDirectory), ...parts].join(' '));
    }
    return `srcset=${quote}${bundled.join(', ')}${quote}`;
  }
);

html = await replaceAsync(
  html,
  /<link\b([^>]*\bhref\s*=\s*(["'])(.*?)\2[^>]*)>/gi,
  async (full, attributes, quote, reference) => {
    if (/\brel\s*=\s*(["'])stylesheet\1/i.test(attributes)) return full;
    const rel = attributes.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() || '';
    if (!/(?:icon|preload)/.test(rel)) return full;
    const embedded = await embedReference(reference, inputDirectory);
    return full.replace(reference, embedded);
  }
);

if (!/^\s*<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`;
html = html.replace(
  /<!doctype html>/i,
  '<!DOCTYPE html>\n<!-- Bundled by html-ppt-agent-skill: local runtime and assets are embedded. -->'
);

const unresolved = [];
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)\s*=\s*(["'])(.*?)\1/gi)) {
  const reference = match[2];
  if (!isRemote(reference) && !isEmbeddedOrFragment(reference)) unresolved.push(reference);
}
for (const match of html.matchAll(/\b(?:src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
  const reference = match[2];
  if (!isRemote(reference) && !isEmbeddedOrFragment(reference)) unresolved.push(reference);
}
if (unresolved.length > 0) {
  throw new Error(`Unresolved local references remain: ${[...new Set(unresolved)].join(', ')}`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html, 'utf8');

console.log(`Bundled: ${output}`);
console.log(`Inlined ${stats.stylesheets} stylesheet(s), ${stats.scripts} script(s), and ${stats.assets} local asset reference(s).`);
if (remoteReferences.size > 0) {
  console.warn('Remote references were preserved and still require a network connection:');
  for (const reference of remoteReferences) console.warn(`- ${reference}`);
}
