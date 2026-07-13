#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const themesRoot = path.join(skillRoot, 'assets', 'themes');

function usage(code = 0) {
  const text = `Usage:
  node scripts/validate-layouts.mjs [options]

Options:
  --theme <theme-id>  Validate one installed theme.
  --json <report>     Write a machine-readable report.
  --strict            Treat warnings as failures.
  --help              Show this message.`;
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
const requestedTheme = option('--theme');
const reportOption = option('--json');
const strict = args.includes('--strict');
const findings = [];
const results = [];

function finding(level, code, message, theme = null, layout = null) {
  findings.push({ level, code, message, ...(theme ? { theme } : {}), ...(layout ? { layout } : {}) });
}
function readJson(file, label, theme) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    finding('error', 'json.invalid', `${label} is invalid JSON: ${error.message}`, theme);
    return null;
  }
}
function setEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function previewLayouts(html) {
  return [...html.matchAll(/data-layout\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

if (!fs.existsSync(themesRoot)) {
  console.error(`Themes directory not found: ${themesRoot}`);
  process.exit(2);
}

const directories = fs.readdirSync(themesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)
  .filter((name) => !requestedTheme || name === requestedTheme)
  .sort();

if (requestedTheme && !directories.length) {
  console.error(`Theme not found: ${requestedTheme}`);
  process.exit(2);
}

for (const themeId of directories) {
  const directory = path.join(themesRoot, themeId);
  const paths = {
    metadata: path.join(directory, 'theme.json'),
    manifest: path.join(directory, 'layout-manifest.json'),
    css: path.join(directory, 'layouts.css'),
    preview: path.join(directory, 'preview.html'),
  };
  for (const [kind, file] of Object.entries(paths)) {
    if (!fs.existsSync(file)) finding('error', `theme.missing-${kind}`, `Missing ${path.basename(file)}.`, themeId);
  }
  if (Object.values(paths).some((file) => !fs.existsSync(file))) continue;

  const metadata = readJson(paths.metadata, 'theme.json', themeId);
  const manifest = readJson(paths.manifest, 'layout-manifest.json', themeId);
  if (!metadata || !manifest) continue;
  const css = fs.readFileSync(paths.css, 'utf8');
  const preview = fs.readFileSync(paths.preview, 'utf8');

  if (manifest.manifestVersion !== 1) finding('error', 'manifest.version', 'manifestVersion must be 1.', themeId);
  if (manifest.theme !== themeId) finding('error', 'manifest.theme', `Manifest theme ${manifest.theme} must match ${themeId}.`, themeId);
  if (!['core', 'backup'].includes(manifest.tier)) finding('error', 'manifest.tier', 'tier must be core or backup.', themeId);
  if (manifest.stage !== '1920x1080') finding('error', 'manifest.stage', 'stage must be 1920x1080.', themeId);

  const metadataTier = metadata.tier || 'core';
  if (manifest.tier !== metadataTier) finding('error', 'manifest.tier-mismatch', `Manifest tier ${manifest.tier} differs from theme tier ${metadataTier}.`, themeId);
  if (metadata.id !== themeId) finding('error', 'theme.id', `theme.json id ${metadata.id} must match ${themeId}.`, themeId);

  const contractsPath = typeof manifest.contracts === 'string' ? path.resolve(directory, manifest.contracts) : null;
  if (!contractsPath || !fs.existsSync(contractsPath)) {
    finding('error', 'manifest.contracts-missing', `Layout contracts file not found: ${manifest.contracts || 'undefined'}.`, themeId);
    continue;
  }
  const contracts = readJson(contractsPath, 'layout contracts', themeId);
  const contractMap = contracts?.layouts;
  if (!contractMap || typeof contractMap !== 'object' || Array.isArray(contractMap)) {
    finding('error', 'contracts.invalid', 'Layout contracts must contain a layouts object.', themeId);
    continue;
  }

  if (!Array.isArray(manifest.layouts)) {
    finding('error', 'manifest.layouts', 'layouts must be an array.', themeId);
    continue;
  }
  const ids = [];
  const selectors = new Set();
  for (const item of manifest.layouts) {
    if (!item || typeof item !== 'object') {
      finding('error', 'layout.invalid', 'Every layout record must be an object.', themeId);
      continue;
    }
    const id = item.id;
    if (typeof id !== 'string' || !id.trim()) {
      finding('error', 'layout.id', 'Layout id is required.', themeId);
      continue;
    }
    if (ids.includes(id)) finding('error', 'layout.duplicate', `Duplicate layout id: ${id}.`, themeId, id);
    ids.push(id);
    if (!contractMap[id]) finding('error', 'layout.contract-missing', `No canonical contract exists for ${id}.`, themeId, id);
    else {
      const contract = contractMap[id];
      if (!contract.name || !contract.purpose || !['required', 'optional', 'forbidden'].includes(contract.visualPolicy)) {
        finding('error', 'layout.contract-invalid', `${id} contract is missing name, purpose, or visualPolicy.`, themeId, id);
      }
      if (!Array.isArray(contract.slots) || !contract.slots.length) finding('error', 'layout.slots', `${id} must define at least one slot.`, themeId, id);
      if (!Array.isArray(contract.variants) || !contract.variants.length) finding('warning', 'layout.variants', `${id} has no variants.`, themeId, id);
    }
    if (typeof item.selector !== 'string' || !item.selector.trim()) finding('error', 'layout.selector', `${id} selector is required.`, themeId, id);
    else {
      if (selectors.has(item.selector)) finding('warning', 'layout.selector-reused', `Selector ${item.selector} is reused.`, themeId, id);
      selectors.add(item.selector);
      if (!css.includes(item.selector)) finding('error', 'layout.css-missing', `Selector ${item.selector} is not implemented in layouts.css.`, themeId, id);
    }
  }

  const minimum = manifest.tier === 'core' ? 12 : 6;
  if (ids.length < minimum) finding('error', 'theme.layout-count', `${manifest.tier} theme requires at least ${minimum} registered layouts; found ${ids.length}.`, themeId);

  const themeLayouts = Array.isArray(metadata.layouts) ? metadata.layouts : [];
  if (!setEqual(themeLayouts, ids)) finding('error', 'theme.layout-list-mismatch', 'theme.json layouts must exactly match layout-manifest.json order.', themeId);

  const aliases = manifest.legacyAliases && typeof manifest.legacyAliases === 'object' ? manifest.legacyAliases : {};
  for (const [alias, target] of Object.entries(aliases)) {
    if (ids.includes(alias)) finding('error', 'alias.collision', `Legacy alias ${alias} collides with a canonical layout.`, themeId);
    if (!ids.includes(target)) finding('error', 'alias.target-missing', `Legacy alias ${alias} targets unregistered layout ${target}.`, themeId);
  }

  const registeredOrAlias = new Set([...ids, ...Object.keys(aliases)]);
  for (const layout of previewLayouts(preview)) {
    if (!registeredOrAlias.has(layout)) finding('error', 'preview.layout-unregistered', `Preview uses unregistered layout ${layout}.`, themeId, layout);
  }

  results.push({ theme: themeId, tier: manifest.tier, layouts: ids.length, aliases: Object.keys(aliases).length });
}

for (const item of findings) {
  const prefix = item.level === 'error' ? 'ERROR' : 'WARN';
  const context = [item.theme, item.layout].filter(Boolean).join('/');
  console.log(`${prefix}${context ? ` [${context}]` : ''} ${item.code}: ${item.message}`);
}
for (const result of results) console.log(`OK [${result.theme}] ${result.layouts} layouts, ${result.aliases} alias(es), tier=${result.tier}`);

const errors = findings.filter((item) => item.level === 'error').length;
const warnings = findings.length - errors;
console.log('Layout validation complete');
console.log(`Themes: ${results.length}`);
console.log(`Findings: ${errors} error(s), ${warnings} warning(s).`);

if (reportOption) {
  const reportPath = path.resolve(reportOption);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ strict, results, findings }, null, 2)}\n`, 'utf8');
  console.log(`Report: ${reportPath}`);
}
if (errors || (strict && warnings)) process.exitCode = 1;
