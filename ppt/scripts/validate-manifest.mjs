#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateRegisteredLayouts } from './lib/layout-registry.mjs';
import { readJson, validateManifestObject } from './lib/visual-contract.mjs';

function usage(code = 0) {
  const text = `Usage:
  node scripts/validate-manifest.mjs <deck.json> [options]

Options:
  --html <deck.html>   Cross-check slide IDs, layouts, and required visuals against HTML.
  --stage <stage>      planning or delivery. Defaults to delivery.
  --json <report.json> Write the complete validation report.
  --strict             Treat warnings as failures.
  --help               Show this help message.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const manifestFile = args[0];
if (!manifestFile || manifestFile.startsWith('--')) usage(2);
function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${name} requires a value.`);
    process.exit(2);
  }
  return value;
}

const manifestPath = path.resolve(manifestFile);
const htmlOption = option('--html');
const reportOption = option('--json');
const strict = args.includes('--strict');
const stage = option('--stage') || 'delivery';
if (!['planning', 'delivery'].includes(stage)) {
  console.error(`Unknown stage: ${stage}. Use planning or delivery.`);
  process.exit(2);
}
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(2);
}
let manifest;
try { manifest = readJson(manifestPath); }
catch (error) {
  console.error(`Invalid JSON: ${error.message}`);
  process.exit(1);
}

let html = null;
let htmlPath = null;
if (htmlOption) {
  htmlPath = path.resolve(htmlOption);
  if (!fs.existsSync(htmlPath)) {
    console.error(`HTML not found: ${htmlPath}`);
    process.exit(2);
  }
  html = fs.readFileSync(htmlPath, 'utf8');
}

const result = validateManifestObject(manifest, { manifestPath, html, htmlPath, strict, stage });
const layoutResult = validateRegisteredLayouts(manifest, manifestPath);
result.findings.push(...layoutResult.findings);
for (const finding of result.findings) {
  const prefix = finding.level === 'error' ? 'ERROR' : 'WARN';
  const slide = finding.slide ? ` [${finding.slide}]` : '';
  console.log(`${prefix}${slide} ${finding.code}: ${finding.message}`);
}

console.log('Manifest validation complete');
console.log(`Stage: ${stage}`);
console.log(`Slides: ${result.summary.slides}`);
console.log(`Registered layouts: ${layoutResult.registered || 'not assigned'}`);
console.log(`Visual slides: ${result.summary.visualSlides}`);
console.log(`Evidence visual slides: ${result.summary.evidenceSlides}`);
console.log(`Text-only slides: ${result.summary.textOnlySlides}`);
console.log(`Visual coverage: ${(result.summary.visualCoverage * 100).toFixed(0)}%`);
console.log(`Evidence coverage: ${(result.summary.evidenceCoverage * 100).toFixed(0)}%`);
console.log(`Consecutive text-only maximum: ${result.summary.maxConsecutiveTextOnly}`);

const report = {
  manifest: manifestPath,
  html: htmlPath,
  strict,
  stage,
  layoutRegistry: manifest.layoutRegistry || null,
  registeredLayouts: layoutResult.registered,
  summary: result.summary,
  findings: result.findings,
};
if (reportOption) {
  const reportPath = path.resolve(reportOption);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report: ${reportPath}`);
}

const errors = result.findings.filter((finding) => finding.level === 'error').length;
const warnings = result.findings.length - errors;
console.log(`Result: ${errors} error(s), ${warnings} warning(s).`);
if (errors || (strict && warnings)) process.exitCode = 1;
