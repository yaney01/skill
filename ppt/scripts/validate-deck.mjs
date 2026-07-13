#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-deck.mjs path/to/deck.html');
  process.exit(2);
}

const absolute = path.resolve(file);
if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(2);
}

const html = fs.readFileSync(absolute, 'utf8');
const errors = [];
const warnings = [];

const count = (pattern) => [...html.matchAll(pattern)].length;
const requirePattern = (pattern, message) => {
  if (!pattern.test(html)) errors.push(message);
};

requirePattern(/class=["'][^"']*deck-viewport\b/i, 'Missing .deck-viewport.');
requirePattern(/class=["'][^"']*deck-stage\b/i, 'Missing .deck-stage.');
requirePattern(/id=["']deckStage["']/i, 'Missing #deckStage.');
requirePattern(/class=["'][^"']*\bslide\b/i, 'No .slide elements found.');
requirePattern(/width\s*:\s*1920px/i, 'Fixed 1920px stage width is not present.');
requirePattern(/height\s*:\s*1080px/i, 'Fixed 1080px stage height is not present.');
requirePattern(/data-deck-id=["'][^"']+["']/i, 'Missing stable data-deck-id.');
requirePattern(/data-slide-id=["'][^"']+["']/i, 'Slides need data-slide-id values.');
requirePattern(/data-layout=["'][^"']+["']/i, 'Slides need data-layout values.');
requirePattern(/prefers-reduced-motion/i, 'Missing prefers-reduced-motion support.');
requirePattern(/data-editable=["']text["']/i, 'No editable text hooks found.');
requirePattern(/localStorage/i, 'No localStorage persistence found.');

const slideCount = count(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>/gi);
const activeCount = count(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*\bactive\b[^"']*["'][^>]*>/gi);
if (slideCount === 0) errors.push('Slide count is zero.');
if (activeCount !== 1) warnings.push(`Expected one initially active slide; found ${activeCount}.`);

const ids = [...html.matchAll(/data-(?:slide|element)-id=["']([^"']+)["']/gi)].map((match) => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) errors.push(`Duplicate stable IDs: ${[...new Set(duplicates)].join(', ')}`);

const editableTags = [...html.matchAll(/<([a-z0-9-]+)\b[^>]*data-editable=["'](?:text|image)["'][^>]*>/gi)];
for (const match of editableTags) {
  if (!/data-element-id=["'][^"']+["']/i.test(match[0])) {
    errors.push(`Editable <${match[1]}> is missing data-element-id.`);
  }
}

if (/\.slide\s*\{[^}]*display\s*:\s*none/is.test(html)) {
  errors.push('Do not hide slides with display:none; use visibility/opacity/pointer-events.');
}

const placeholders = [
  /lorem ipsum/i,
  /replace this demo/i,
  /presentation title/i,
  /content\.\.\./i,
  /todo(?:\b|:)/i
];
for (const pattern of placeholders) {
  if (pattern.test(html)) warnings.push(`Possible placeholder content matched: ${pattern}`);
}

if (/<script\b[^>]+src=/i.test(html) || /<link\b[^>]+rel=["']stylesheet["'][^>]+href=(?!["']data:)/i.test(html)) {
  warnings.push('External script or stylesheet dependency found. Final delivery should inline runtime assets.');
}

if (/position\s*:\s*absolute/gi.test(html) && !/overflow\s*:\s*hidden/gi.test(html)) {
  warnings.push('Absolute positioning is present but overflow containment was not detected.');
}

console.log(`Validated: ${absolute}`);
console.log(`Slides: ${slideCount}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length) process.exit(1);
console.log(`PASS with ${warnings.length} warning(s).`);
