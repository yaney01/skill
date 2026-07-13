#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { syncVisualWorkOrders, validateVisualWorkOrders, VISUAL_STAGES } from './lib/visual-work-orders.mjs';

function usage(code = 0) {
  const text = `Usage:
  node scripts/sync-visual-work-orders.mjs <visual-work-orders.json> [options]

Options:
  --deck <deck.json>    Deck to update. Defaults to plan.deck.manifest.
  --stage <stage>       planning or delivery. Defaults to the plan stage.
  --write               Overwrite deck.json after validation.
  --output <file>       Write an updated deck copy instead of overwriting.
  --help                Show this help message.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const planFile = args[0];
if (!planFile || planFile.startsWith('--')) usage(2);

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

function readJson(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) {
    console.error(`Invalid ${label} JSON: ${error.message}`);
    process.exit(1);
  }
}

const planPath = path.resolve(planFile);
if (!fs.existsSync(planPath)) {
  console.error(`Visual work orders not found: ${planPath}`);
  process.exit(2);
}
const plan = readJson(planPath, 'visual work-order');
let deckPath = option('--deck');
if (!deckPath && plan.deck?.manifest) deckPath = path.resolve(path.dirname(planPath), plan.deck.manifest);
else if (deckPath) deckPath = path.resolve(deckPath);
if (!deckPath || !fs.existsSync(deckPath)) {
  console.error(`Deck manifest not found: ${deckPath || 'not specified'}`);
  process.exit(2);
}
const deck = readJson(deckPath, 'deck');
const stage = option('--stage') || plan.stage || 'planning';
if (!VISUAL_STAGES.has(stage)) {
  console.error(`Unknown stage: ${stage}. Use planning or delivery.`);
  process.exit(2);
}

const preflight = validateVisualWorkOrders(plan, { deck, deckPath, stage: 'planning', strict: false });
const errors = preflight.findings.filter((finding) => finding.level === 'error');
if (errors.length) {
  for (const finding of errors) console.error(`ERROR${finding.slide ? ` [${finding.slide}]` : ''} ${finding.code}: ${finding.message}`);
  console.error(`Sync blocked by ${errors.length} validation error(s).`);
  process.exit(1);
}

const workOrdersReference = path.relative(path.dirname(deckPath), planPath).replaceAll('\\', '/') || path.basename(planPath);
let updated;
try {
  updated = syncVisualWorkOrders(plan, deck, { workOrders: workOrdersReference, stage });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const outputOption = option('--output');
const write = args.includes('--write');
if (write && outputOption) {
  console.error('Use either --write or --output, not both.');
  process.exit(2);
}
if (!write && !outputOption) {
  console.log(`Visual work orders are compatible with ${deckPath}.`);
  console.log(`Slides to synchronize: ${updated.slides.length}`);
  console.log('No files changed. Use --write or --output <file>.');
  process.exit(0);
}
const target = write ? deckPath : path.resolve(outputOption);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
console.log('Visual work orders synchronized');
console.log(`Deck: ${updated.id}`);
console.log(`Stage: ${stage}`);
console.log(`Slides: ${updated.slides.length}`);
console.log(`Output: ${target}`);
