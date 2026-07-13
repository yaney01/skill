#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function usage(code = 0) {
  const text = `Usage:
  node scripts/validate-source.mjs <source/manifest.json> [--strict] [--source <original-file>]

Checks the standardized source manifest, referenced files, page ordering, IDs,
asset metadata, preservation rules, and optional original-file digest.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const manifestArg = args[0];
if (!manifestArg || manifestArg.startsWith('--')) usage(2);
const strict = args.includes('--strict');
const sourceIndex = args.indexOf('--source');
const originalArg = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
if (sourceIndex >= 0 && (!originalArg || originalArg.startsWith('--'))) usage(2);

const manifestPath = path.resolve(manifestArg);
const root = path.dirname(manifestPath);
const errors = [];
const warnings = [];

function problem(level, code, message, item = 'manifest') {
  (level === 'error' ? errors : warnings).push({ level, code, item, message });
}
function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function insideRoot(file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function referencedFile(relative, item, required = true) {
  if (typeof relative !== 'string' || !relative.trim()) {
    if (required) problem('error', 'path.missing', `${item} is missing a path.`, item);
    return null;
  }
  if (/^[a-z]+:\/\//i.test(relative)) return null;
  const resolved = path.resolve(root, relative);
  if (!insideRoot(resolved)) {
    problem('error', 'path.escape', `${relative} escapes the standardized source directory.`, item);
    return null;
  }
  if (!fs.existsSync(resolved)) problem('error', 'path.not-found', `Referenced file does not exist: ${relative}`, item);
  else if (!fs.statSync(resolved).isFile()) problem('error', 'path.not-file', `Referenced path is not a file: ${relative}`, item);
  return resolved;
}

if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(2);
}
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (error) {
  console.error(`Invalid JSON: ${error.message}`);
  process.exit(1);
}

if (manifest.manifestVersion !== 1) problem('error', 'manifest.version', 'manifestVersion must be 1.');
if (!isObject(manifest.source)) problem('error', 'source.missing', 'source metadata is required.');
else {
  if (!['pptx', 'docx', 'pdf', 'markdown'].includes(manifest.source.type)) problem('error', 'source.type', `Unsupported source.type: ${manifest.source.type}`);
  if (typeof manifest.source.fileName !== 'string' || !manifest.source.fileName.trim()) problem('error', 'source.filename', 'source.fileName is required.');
  if (!/^[a-f0-9]{64}$/i.test(manifest.source.sha256 || '')) problem('error', 'source.sha256', 'source.sha256 must be a SHA-256 digest.');
  if (!Number.isInteger(manifest.source.sizeBytes) || manifest.source.sizeBytes < 1) problem('error', 'source.size', 'source.sizeBytes must be a positive integer.');
}
if (!Array.isArray(manifest.pages)) problem('error', 'pages.type', 'pages must be an array.');
const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
if (manifest.pageCount !== pages.length) problem('error', 'pages.count', `pageCount ${manifest.pageCount} does not match pages.length ${pages.length}.`);
if (!pages.length) problem('error', 'pages.empty', 'At least one page or section is required.');

const pageIds = new Set();
const assetPaths = new Map();
for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index];
  const expectedId = `page-${String(index + 1).padStart(3, '0')}`;
  const label = page?.id || `page[${index}]`;
  if (!isObject(page)) { problem('error', 'page.type', `Page ${index + 1} must be an object.`, label); continue; }
  if (page.id !== expectedId) problem('error', 'page.id-order', `Expected ${expectedId}, found ${page.id}.`, label);
  if (pageIds.has(page.id)) problem('error', 'page.id-duplicate', `Duplicate page ID: ${page.id}`, label);
  pageIds.add(page.id);
  if (page.sourceIndex !== index + 1) problem('warning', 'page.source-index', `sourceIndex is ${page.sourceIndex}; expected ${index + 1}.`, label);
  if (typeof page.title !== 'string' || !page.title.trim()) problem('warning', 'page.title', 'Page title is empty.', label);
  const textFile = referencedFile(page.textPath, `${label}.textPath`);
  if (textFile && path.extname(textFile).toLowerCase() !== '.md') problem('warning', 'page.text-format', 'Page text should use Markdown.', label);
  if (page.notesPath != null) referencedFile(page.notesPath, `${label}.notesPath`);
  if (!isObject(page.preservation)) problem('error', 'page.preservation', 'Page preservation rules are required.', label);
  else for (const key of ['verbatim', 'layout', 'allowMerge', 'allowCondense', 'allowOmit']) {
    if (typeof page.preservation[key] !== 'boolean') problem('error', 'page.preservation-flag', `preservation.${key} must be boolean.`, label);
  }
  if (!Array.isArray(page.provenance) || !page.provenance.length) problem('error', 'page.provenance', 'At least one provenance record is required.', label);

  for (const collectionName of ['images', 'tables', 'charts']) {
    const collection = page[collectionName];
    if (!Array.isArray(collection)) { problem('error', `page.${collectionName}`, `${collectionName} must be an array.`, label); continue; }
    for (const asset of collection) {
      const assetLabel = `${label}.${collectionName}.${asset?.id || '?'}`;
      if (!isObject(asset) || typeof asset.id !== 'string') { problem('error', 'asset.id', 'Asset ID is required.', assetLabel); continue; }
      const external = collectionName === 'images' && asset.external === true;
      const file = referencedFile(asset.path, `${assetLabel}.path`, !external);
      if (!external && typeof asset.path === 'string') {
        const prior = assetPaths.get(asset.path);
        if (prior && prior !== assetLabel) problem('warning', 'asset.path-reused', `Asset path is reused by ${prior} and ${assetLabel}.`, assetLabel);
        assetPaths.set(asset.path, assetLabel);
      }
      if (collectionName === 'images') {
        if (asset.width != null && (!Number.isFinite(asset.width) || asset.width <= 0)) problem('error', 'image.width', 'Image width must be positive or null.', assetLabel);
        if (asset.height != null && (!Number.isFinite(asset.height) || asset.height <= 0)) problem('error', 'image.height', 'Image height must be positive or null.', assetLabel);
        if (asset.preservePixelFaithful === true && asset.allowCrop === true) problem('warning', 'image.crop-conflict', 'Pixel-faithful image is also marked crop-allowed.', assetLabel);
      } else if (file) {
        try { JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch (error) { problem('error', 'asset.json-invalid', `Invalid JSON asset: ${error.message}`, assetLabel); }
      }
    }
  }
}

if (!isObject(manifest.assets)) problem('error', 'assets.missing', 'Global assets index is required.');
if (!Array.isArray(manifest.warnings)) problem('error', 'warnings.type', 'warnings must be an array.');
else for (const warning of manifest.warnings) {
  if (!isObject(warning) || typeof warning.code !== 'string' || typeof warning.message !== 'string') problem('error', 'warning.shape', 'Each warning requires code and message.');
  else problem('warning', `import.${warning.code}`, warning.message, warning.page || 'source');
}
referencedFile('README.md', 'README.md');
referencedFile('citations.json', 'citations.json');

if (originalArg && isObject(manifest.source)) {
  const original = path.resolve(originalArg);
  if (!fs.existsSync(original)) problem('error', 'source.original-missing', `Original source not found: ${original}`);
  else {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex');
    if (digest !== manifest.source.sha256) problem('error', 'source.digest-mismatch', 'Original source SHA-256 does not match the manifest.');
    if (fs.statSync(original).size !== manifest.source.sizeBytes) problem('error', 'source.size-mismatch', 'Original source size does not match the manifest.');
  }
}

for (const item of [...errors, ...warnings]) console.log(`${item.level === 'error' ? 'ERROR' : 'WARN'} [${item.item}] ${item.code}: ${item.message}`);
console.log('Source validation complete');
console.log(`Type: ${manifest.source?.type || 'unknown'}`);
console.log(`Pages/sections: ${pages.length}`);
console.log(`Images: ${pages.reduce((sum, page) => sum + (Array.isArray(page.images) ? page.images.length : 0), 0)}`);
console.log(`Tables: ${pages.reduce((sum, page) => sum + (Array.isArray(page.tables) ? page.tables.length : 0), 0)}`);
console.log(`Charts: ${pages.reduce((sum, page) => sum + (Array.isArray(page.charts) ? page.charts.length : 0), 0)}`);
console.log(`Findings: ${errors.length} errors, ${warnings.length} warnings.`);
if (errors.length || (strict && warnings.length)) process.exitCode = 1;
