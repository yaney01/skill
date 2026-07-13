#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file || ['--help', '-h'].includes(file)) {
  console.error('Usage: node scripts/validate-deck.mjs path/to/deck.html');
  process.exit(file ? 0 : 2);
}

const absolute = path.resolve(file);
if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(2);
}

const html = fs.readFileSync(absolute, 'utf8');
const baseDirectory = path.dirname(absolute);
const errors = [];
const warnings = [];
const dependencyText = [];

function isLocal(reference) {
  return Boolean(reference) && !/^(?:https?:)?\/\//i.test(reference) && !/^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(reference);
}

function resolveReference(reference) {
  const pathname = reference.split(/[?#]/, 1)[0];
  return path.resolve(baseDirectory, decodeURIComponent(pathname));
}

function recordDependency(reference, kind) {
  if (!isLocal(reference)) return;
  const resolved = resolveReference(reference);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    errors.push(`${kind} not found: ${reference}`);
    return;
  }
  dependencyText.push(fs.readFileSync(resolved, 'utf8'));
}

for (const match of html.matchAll(/<link\b[^>]*\brel\s*=\s*(["'])stylesheet\1[^>]*>/gi)) {
  const href = match[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
  recordDependency(href, 'Stylesheet');
}
for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
  recordDependency(match[2], 'Script');
}

const combined = `${html}\n${dependencyText.join('\n')}`;
const count = (pattern, source = html) => [...source.matchAll(pattern)].length;
const requirePattern = (pattern, message, source = combined) => {
  if (!pattern.test(source)) errors.push(message);
};

requirePattern(/class=["'][^"']*deck-viewport\b/i, 'Missing .deck-viewport.', html);
requirePattern(/class=["'][^"']*deck-stage\b/i, 'Missing .deck-stage.', html);
requirePattern(/id=["']deckStage["']/i, 'Missing #deckStage.', html);
requirePattern(/class=["'][^"']*\bslide\b/i, 'No .slide elements found.', html);
requirePattern(/width\s*:\s*1920px/i, 'Fixed 1920px stage width is not present.');
requirePattern(/height\s*:\s*1080px/i, 'Fixed 1080px stage height is not present.');
requirePattern(/data-deck-id=["'][^"']+["']/i, 'Missing stable data-deck-id.', html);
requirePattern(/data-slide-id=["'][^"']+["']/i, 'Slides need data-slide-id values.', html);
requirePattern(/data-layout=["'][^"']+["']/i, 'Slides need data-layout values.', html);
requirePattern(/prefers-reduced-motion/i, 'Missing prefers-reduced-motion support.');
requirePattern(/data-editable=["']text["']/i, 'No editable text hooks found.', html);
requirePattern(/localStorage/i, 'No localStorage persistence found.');

const slideCount = count(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>/gi);
const activeCount = count(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*\bactive\b[^"']*["'][^>]*>/gi);
if (slideCount === 0) errors.push('No <section class="slide"> elements found.');
if (activeCount !== 1) errors.push(`Expected exactly one initially active slide; found ${activeCount}.`);

function duplicateValues(pattern, source = html) {
  const values = [...source.matchAll(pattern)].map((match) => match[1]);
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

const duplicateIds = duplicateValues(/\bid=["']([^"']+)["']/gi);
if (duplicateIds.length) errors.push(`Duplicate HTML id values: ${duplicateIds.join(', ')}`);
const duplicateSlideIds = duplicateValues(/\bdata-slide-id=["']([^"']+)["']/gi);
if (duplicateSlideIds.length) errors.push(`Duplicate data-slide-id values: ${duplicateSlideIds.join(', ')}`);
const duplicateElementIds = duplicateValues(/\bdata-element-id=["']([^"']+)["']/gi);
if (duplicateElementIds.length) errors.push(`Duplicate data-element-id values: ${duplicateElementIds.join(', ')}`);

for (const match of html.matchAll(/\b(?:src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
  const reference = match[2];
  if (!isLocal(reference)) continue;
  const resolved = resolveReference(reference);
  if (!fs.existsSync(resolved)) errors.push(`Local asset not found: ${reference}`);
}

if (/\.slide\s*\{[^}]*display\s*:\s*none/is.test(combined)) {
  errors.push('Do not hide slides with display:none; use visibility, opacity, and pointer-events.');
}
if (/A browser-editable deck|Replace this demo|EDIT IN BROWSER/i.test(html)) {
  warnings.push('Starter placeholder content remains. Replace it before final delivery.');
}
if (/<(?:img|video)\b[^>]*(?:src|poster)=["']["']/i.test(html)) {
  warnings.push('An image or video has an empty source.');
}

console.log(`Validated ${absolute}`);
console.log(`Slides: ${slideCount}`);
if (warnings.length) {
  console.warn(`Warnings (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error(`Errors (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Validation passed.');
