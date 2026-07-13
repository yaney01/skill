import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runNode, temporaryDirectory } from './helpers.mjs';

test('create-deck emits synchronized visual work orders for every generated slide', () => {
  const output = temporaryDirectory('html-ppt-create-visual-orders-');
  const result = runNode([
    'scripts/create-deck.mjs',
    '--name', 'visual-orders-generated-project',
    '--title', 'Visual Orders Generated Project',
    '--theme', 'swiss-grid',
    '--output', output,
    '--force',
  ]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const deckPath = path.join(output, 'deck.json');
  const planPath = path.join(output, 'qa', 'visual-work-orders.json');
  const markdownPath = path.join(output, 'qa', 'visual-work-orders.md');
  assert.ok(fs.existsSync(deckPath));
  assert.ok(fs.existsSync(planPath));
  assert.ok(fs.existsSync(markdownPath));

  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(plan.deck.id, deck.id);
  assert.equal(plan.deck.manifest, '../deck.json');
  assert.equal(plan.items.length, deck.slides.length);
  assert.deepEqual(plan.items.map((item) => item.slideId), deck.slides.map((slide) => slide.id));
  assert.match(fs.readFileSync(markdownPath, 'utf8'), /Visual work orders/);
  assert.match(result.stdout, /Visual work orders: qa\/visual-work-orders\.json/);

  const validation = runNode([
    'scripts/validate-visual-work-orders.mjs',
    planPath,
    '--deck', deckPath,
    '--stage', 'planning',
    '--strict',
  ]);
  assert.equal(validation.status, 0, `${validation.stdout}\n${validation.stderr}`);
});
