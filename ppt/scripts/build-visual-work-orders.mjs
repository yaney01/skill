#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildVisualWorkOrders, writeVisualWorkOrders, VISUAL_STAGES } from './lib/visual-work-orders.mjs';

function usage(code = 0) {
  const text = `Usage:
  node scripts/build-visual-work-orders.mjs <deck.json> [options]

Options:
  --output <file>       JSON output. Defaults to <deck-dir>/qa/visual-work-orders.json.
  --markdown <file>     Markdown output. Defaults beside the JSON output.
  --stage <stage>       planning or delivery. Defaults to planning.
  --force               Overwrite existing outputs.
  --help                Show this help message.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const deckFile = args[0];
if (!deckFile || deckFile.startsWith('--')) usage(2);

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

const deckPath = path.resolve(deckFile);
if (!fs.existsSync(deckPath)) {
  console.error(`Deck manifest not found: ${deckPath}`);
  process.exit(2);
}
let deck;
try { deck = JSON.parse(fs.readFileSync(deckPath, 'utf8')); }
catch (error) {
  console.error(`Invalid deck JSON: ${error.message}`);
  process.exit(1);
}

const stage = option('--stage') || 'planning';
if (!VISUAL_STAGES.has(stage)) {
  console.error(`Unknown stage: ${stage}. Use planning or delivery.`);
  process.exit(2);
}
const defaultJson = path.join(path.dirname(deckPath), 'qa', 'visual-work-orders.json');
const jsonPath = path.resolve(option('--output') || defaultJson);
const markdownPath = path.resolve(option('--markdown') || path.join(path.dirname(jsonPath), `${path.basename(jsonPath, path.extname(jsonPath))}.md`));

try {
  const plan = buildVisualWorkOrders(deck, { stage });
  const written = writeVisualWorkOrders(plan, {
    jsonPath,
    markdownPath,
    manifestPath: deckPath,
    force: args.includes('--force'),
  });
  const summary = written.plan.summary;
  console.log('Visual work orders created');
  console.log(`Deck: ${written.plan.deck.id}`);
  console.log(`Slides: ${summary.total}`);
  console.log(`Required: ${summary.required}`);
  console.log(`Ready: ${summary.ready}`);
  console.log(`Planned: ${summary.planned}`);
  console.log(`Missing: ${summary.missing}`);
  console.log(`JSON: ${written.jsonPath}`);
  console.log(`Markdown: ${written.markdownPath}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
