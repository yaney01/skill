#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage(code = 0) {
  const text = `Usage:
  node scripts/bundle-html.mjs <input.html> [output.html]

Bundles local stylesheets, scripts, images, fonts, media, CSS url() assets,
and the adjacent deck.json manifest into one portable HTML file.
Remote URLs are preserved and reported.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const [inputArg, outputArg, ...extra] = process.argv.slice(2);
if (!inputArg || extra.length || ['--help', '-h'].includes(inputArg)) usage(inputArg ? 0 : 2);
const input = path.resolve(inputArg);
if (!fs.existsSync(input) || !fs.statSync(input).isFile()) {
  console.error(`Input file not found: ${input}`);
  process.exit(2);
}
const inputDirectory = path.dirname(input);
const extension = path.extname(input);
const output = path.resolve(outputArg || path.join(inputDirectory, `${path.basename(input, extension)}.bundled${extension || '.html'}`));
if (output === input) {
  console.error('Output must not overwrite the source HTML.');
  process.exit(2);
}

const stats = { stylesheets: 0, scripts: 0, assets: 0, manifests: 0 };
const remoteReferences = new Set();
const mimeTypes = new Map([
  ['.avif', 'image/avif'], ['.bmp', 'image/bmp'], ['.gif', 'image/gif'], ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2'], ['.ttf', 'font/ttf'], ['.otf', 'font/otf'],
  ['.mp3', 'audio/mpeg'], ['.ogg', 'audio/ogg'], ['.wav', 'audio/wav'], ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
  ['.json', 'application/json'], ['.pdf', 'application/pdf'],
]);

const isRemote = (value) => /^(?:https?:)?\/\//i.test(value);
const isEmbeddedOrFragment = (value) => /^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(value);
function splitReference(reference) {
  const match = reference.match(/^([^?#]*)([?#].*)?$/);
  return { pathname: match?.[1] || reference, suffix: match?.[2] || '' };
}
function resolveLocal(reference, baseDirectory) {
  const decoded = decodeURIComponent(splitReference(reference).pathname);
  return decoded.startsWith('file://') ? new URL(decoded).pathname : path.resolve(baseDirectory, decoded);
}
function toDataUri(file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Referenced local asset does not exist: ${file}`);
  const mime = mimeTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
  stats.assets += 1;
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}
async function replaceAsync(text, pattern, replacer) {
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return text;
  const values = await Promise.all(matches.map((match) => replacer(...match)));
  let cursor = 0;
  let result = '';
  matches.forEach((match, index) => {
    result += text.slice(cursor, match.index) + values[index];
    cursor = match.index + match[0].length;
  });
  return result + text.slice(cursor);
}
async function embedReference(reference, baseDirectory) {
  const value = reference.trim();
  if (!value || isEmbeddedOrFragment(value)) return reference;
  if (isRemote(value)) {
    remoteReferences.add(value);
    return reference;
  }
  return toDataUri(resolveLocal(value, baseDirectory));
}
async function embedCssUrls(css, baseDirectory) {
  return replaceAsync(css, /url\(\s*(["']?)([^"')]+)\1\s*\)/gi, async (full, quote, reference) => {
    const embedded = await embedReference(reference, baseDirectory);
    return `url("${embedded.replaceAll('"', '%22')}")`;
  });
}
const escapeStyle = (value) => value.replace(/<\/style/gi, '<\\/style');
const escapeScript = (value) => value.replace(/<\/script/gi, '<\\/script');

let html = fs.readFileSync(input, 'utf8');
html = await replaceAsync(html, /<link\b([^>]*\brel\s*=\s*(["'])stylesheet\2[^>]*)>/gi, async (full, attributes) => {
  const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
  if (!href || isEmbeddedOrFragment(href)) return full;
  if (isRemote(href)) { remoteReferences.add(href); return full; }
  const file = resolveLocal(href, inputDirectory);
  if (!fs.existsSync(file)) throw new Error(`Stylesheet not found: ${file}`);
  const css = await embedCssUrls(fs.readFileSync(file, 'utf8'), path.dirname(file));
  stats.stylesheets += 1;
  return `<style data-bundled-from="${href.replaceAll('"', '&quot;')}">\n${escapeStyle(css)}\n</style>`;
});
html = await replaceAsync(html, /<script\b([^>]*\bsrc\s*=\s*(["'])(.*?)\2[^>]*)>\s*<\/script>/gi, async (full, attributes, quote, source) => {
  if (isEmbeddedOrFragment(source)) return full;
  if (isRemote(source)) { remoteReferences.add(source); return full; }
  const file = resolveLocal(source, inputDirectory);
  if (!fs.existsSync(file)) throw new Error(`Script not found: ${file}`);
  const cleaned = attributes.replace(/\s*src\s*=\s*(["']).*?\1/i, '').replace(/\s*defer\b/i, '').trim();
  stats.scripts += 1;
  return `<script${cleaned ? ` ${cleaned}` : ''} data-bundled-from="${source.replaceAll('"', '&quot;')}">\n${escapeScript(fs.readFileSync(file, 'utf8'))}\n</script>`;
});
html = await replaceAsync(html, /<style\b([^>]*)>([\s\S]*?)<\/style>/gi, async (full, attributes, css) => `<style${attributes}>${escapeStyle(await embedCssUrls(css, inputDirectory))}</style>`);
html = await replaceAsync(html, /\b(src|poster)\s*=\s*(["'])(.*?)\2/gi, async (full, attribute, quote, reference) => `${attribute}=${quote}${await embedReference(reference, inputDirectory)}${quote}`);
html = await replaceAsync(html, /\bsrcset\s*=\s*(["'])(.*?)\1/gi, async (full, quote, value) => {
  const result = [];
  for (const candidate of value.split(',').map((item) => item.trim()).filter(Boolean)) {
    const parts = candidate.split(/\s+/);
    result.push([await embedReference(parts.shift(), inputDirectory), ...parts].join(' '));
  }
  return `srcset=${quote}${result.join(', ')}${quote}`;
});
html = await replaceAsync(html, /<link\b([^>]*\bhref\s*=\s*(["'])(.*?)\2[^>]*)>/gi, async (full, attributes, quote, reference) => {
  if (/\brel\s*=\s*(["'])stylesheet\1/i.test(attributes)) return full;
  const rel = attributes.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase() || '';
  if (!/(?:icon|preload)/.test(rel)) return full;
  return full.replace(reference, await embedReference(reference, inputDirectory));
});

const manifestPath = path.join(inputDirectory, 'deck.json');
if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile()) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`Adjacent deck.json is invalid: ${error.message}`); }
  const json = JSON.stringify(manifest).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  const tag = `<script type="application/json" id="htmlPptManifest">${json}</script>`;
  if (/<script\b[^>]*id=["']htmlPptManifest["'][^>]*>[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(/<script\b[^>]*id=["']htmlPptManifest["'][^>]*>[\s\S]*?<\/script>/i, tag);
  } else {
    html = html.replace(/<\/body>/i, `${tag}\n</body>`);
  }
  stats.manifests = 1;
}

if (!/^\s*<!doctype html>/i.test(html)) html = `<!DOCTYPE html>\n${html}`;
html = html.replace(/<!doctype html>/i, '<!DOCTYPE html>\n<!-- Bundled by html-ppt-agent-skill: local runtime, manifest, and assets are embedded. -->');

const unresolved = [];
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)\s*=\s*(["'])(.*?)\1/gi)) {
  if (!isRemote(match[2]) && !isEmbeddedOrFragment(match[2])) unresolved.push(match[2]);
}
for (const match of html.matchAll(/\b(?:src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
  if (!isRemote(match[2]) && !isEmbeddedOrFragment(match[2])) unresolved.push(match[2]);
}
if (unresolved.length) throw new Error(`Unresolved local references remain: ${[...new Set(unresolved)].join(', ')}`);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html, 'utf8');
console.log(`Bundled: ${output}`);
console.log(`Inlined ${stats.stylesheets} stylesheet(s), ${stats.scripts} script(s), ${stats.manifests} manifest(s), and ${stats.assets} local asset reference(s).`);
if (remoteReferences.size) {
  console.warn('Remote references were preserved and still require a network connection:');
  for (const reference of remoteReferences) console.warn(`- ${reference}`);
}
