#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateVisualWorkOrders, VISUAL_STAGES } from './lib/visual-work-orders.mjs';

function usage(code = 0) {
  const text = `Usage:
  node scripts/validate-visual-work-orders.mjs <visual-work-orders.json> [options]

Options:
  --deck <deck.json>    Cross-check work orders against deck.json. Defaults to plan.deck.manifest.
  --stage <stage>       planning or delivery. Defaults to the plan stage.
  --ratio-tolerance <n> Relative ratio tolerance. Defaults to 0.05.
  --json <report.json>  Write validation report.
  --strict              Treat warnings as failures.
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
const stage = option('--stage') || plan.stage || 'planning';
if (!VISUAL_STAGES.has(stage)) {
  console.error(`Unknown stage: ${stage}. Use planning or delivery.`);
  process.exit(2);
}
const toleranceOption = option('--ratio-tolerance');
const ratioTolerance = toleranceOption == null ? 0.05 : Number(toleranceOption);
if (!(Number.isFinite(ratioTolerance) && ratioTolerance >= 0 && ratioTolerance <= 1)) {
  console.error('--ratio-tolerance must be a number between 0 and 1.');
  process.exit(2);
}

let deckPath = option('--deck');
if (!deckPath && plan.deck?.manifest) deckPath = path.resolve(path.dirname(planPath), plan.deck.manifest);
else if (deckPath) deckPath = path.resolve(deckPath);
let deck = null;
if (deckPath) {
  if (!fs.existsSync(deckPath)) {
    console.error(`Deck manifest not found: ${deckPath}`);
    process.exit(2);
  }
  deck = readJson(deckPath, 'deck');
}

const strict = args.includes('--strict');
const result = validateVisualWorkOrders(plan, {
  deck,
  deckPath,
  projectRoot: deckPath ? path.dirname(deckPath) : path.dirname(planPath),
  stage,
  strict,
  ratioTolerance,
});

for (const finding of result.findings) {
  const prefix = finding.level === 'error' ? 'ERROR' : 'WARN';
  const slide = finding.slide ? ` [${finding.slide}]` : '';
  console.log(`${prefix}${slide} ${finding.code}: ${finding.message}`);
}
console.log('Visual work-order validation complete');
console.log(`Stage: ${stage}`);
console.log(`Items: ${result.summary.total}`);
console.log(`Required: ${result.summary.required}`);
console.log(`Ready: ${result.summary.ready}`);
console.log(`Planned: ${result.summary.planned}`);
console.log(`Missing: ${result.summary.missing}`);
console.log(`File deliveries: ${result.summary.fileDeliveries}`);
console.log(`DOM deliveries: ${result.summary.domDeliveries}`);
console.log(`Delivery ready: ${result.summary.deliveryReady}`);
console.log(`Result: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s).`);

const reportOption = option('--json');
if (reportOption) {
  const reportPath = path.resolve(reportOption);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ plan: planPath, deck: deckPath, stage, strict, ratioTolerance, summary: result.summary, findings: result.findings }, null, 2)}\n`, 'utf8');
  console.log(`Report: ${reportPath}`);
}
if (result.summary.errors || (strict && result.summary.warnings)) process.exitCode = 1;
