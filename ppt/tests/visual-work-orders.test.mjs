import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildVisualWorkOrders,
  renderVisualWorkOrdersMarkdown,
  syncVisualWorkOrders,
  validateVisualWorkOrders,
  writeVisualWorkOrders,
} from '../scripts/lib/visual-work-orders.mjs';
import { runNode, temporaryDirectory } from './helpers.mjs';

function fixtureDeck() {
  return {
    manifestVersion: 2,
    id: 'visual-production-fixture',
    title: 'Visual production fixture',
    language: 'en-US',
    density: 'speaker-led',
    style: 'swiss-grid',
    visualStrategy: {
      mode: 'generated-and-diagram',
      targetCoverage: 0.67,
      targetEvidenceCoverage: 0.33,
      maxConsecutiveTextOnly: 2,
    },
    slides: [
      {
        id: 'slide-01',
        purpose: 'hook',
        layout: 'image-left',
        headline: 'A generated scene establishes the context',
        visual: {
          type: 'editorial-illustration',
          required: true,
          status: 'planned',
          source: 'generated',
          role: 'context',
          slot: '16:9',
          focus: 'right-center',
        },
      },
      {
        id: 'slide-02',
        purpose: 'explain',
        layout: 'process',
        headline: 'A semantic diagram explains the workflow',
        visual: {
          type: 'workflow-diagram',
          required: true,
          status: 'ready',
          source: 'html',
          role: 'explanation',
        },
      },
      {
        id: 'slide-03',
        purpose: 'close',
        layout: 'closing',
        headline: 'The closing is intentionally typographic',
        visual: {
          type: 'typographic',
          required: false,
          status: 'ready',
          source: 'css',
          role: 'typography',
        },
      },
    ],
  };
}

function writeSvg(file, width, height) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ddd"/></svg>`, 'utf8');
}

test('builder emits one ordered work order per slide and synthesizes generated prompts', () => {
  const deck = fixtureDeck();
  const plan = buildVisualWorkOrders(deck, { generatedAt: '2026-07-14T00:00:00.000Z' });
  assert.equal(plan.planVersion, 1);
  assert.equal(plan.deck.id, deck.id);
  assert.equal(plan.items.length, deck.slides.length);
  assert.deepEqual(plan.items.map((item) => item.slideId), ['slide-01', 'slide-02', 'slide-03']);
  assert.equal(plan.items[0].delivery, 'file');
  assert.match(plan.items[0].prompt, /Slide claim: A generated scene establishes the context/);
  assert.match(plan.items[0].prompt, /No text, letters, numbers, logos/);
  assert.equal(plan.items[1].delivery, 'dom');
  assert.equal(plan.items[2].delivery, 'typography');
  assert.equal(plan.summary.required, 2);
  assert.equal(plan.summary.deliveryReady, false);
  const markdown = renderVisualWorkOrdersMarkdown(plan);
  assert.match(markdown, /Visual work orders/);
  assert.match(markdown, /slide-01/);
  assert.match(markdown, /Generated scene establishes/i);
});

test('planning reports required planned visuals while delivery blocks them', () => {
  const deck = fixtureDeck();
  const plan = buildVisualWorkOrders(deck);
  const planning = validateVisualWorkOrders(plan, { deck, stage: 'planning' });
  assert.equal(planning.summary.errors, 0);
  assert.ok(planning.findings.some((finding) => finding.code === 'item.required-not-ready' && finding.level === 'warning'));
  const delivery = validateVisualWorkOrders(plan, { deck, stage: 'delivery' });
  assert.ok(delivery.summary.errors > 0);
  assert.ok(delivery.findings.some((finding) => finding.code === 'item.required-not-ready' && finding.level === 'error'));
});

test('ready file assets synchronize into deck.json and pass delivery ratio validation', () => {
  const directory = temporaryDirectory('html-ppt-visual-ready-');
  const deckPath = path.join(directory, 'deck.json');
  const assetPath = path.join(directory, 'images', 'slide-01.svg');
  writeSvg(assetPath, 1600, 900);
  const deck = fixtureDeck();
  fs.writeFileSync(deckPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  const plan = buildVisualWorkOrders(deck);
  Object.assign(plan.items[0], {
    status: 'ready',
    path: 'images/slide-01.svg',
    alt: 'Editorial scene showing a designer using an AI-assisted production workflow',
  });
  const synced = syncVisualWorkOrders(plan, deck, {
    workOrders: 'qa/visual-work-orders.json',
    stage: 'delivery',
    syncedAt: '2026-07-14T00:00:00.000Z',
  });
  assert.equal(synced.slides[0].layout, 'image-left');
  assert.equal(synced.slides[0].visual.status, 'ready');
  assert.equal(synced.slides[0].visual.path, 'images/slide-01.svg');
  assert.equal(synced.slides[0].visual.assetId, 'slide-01-visual');
  assert.equal(synced.visualProduction.stage, 'delivery');
  const delivery = validateVisualWorkOrders(plan, { deck: synced, deckPath, stage: 'delivery', strict: true });
  assert.equal(delivery.summary.errors, 0, JSON.stringify(delivery.findings, null, 2));
  assert.equal(delivery.summary.warnings, 0, JSON.stringify(delivery.findings, null, 2));
});

test('delivery rejects wrong ratios, missing alt text, and paths outside the project', () => {
  const directory = temporaryDirectory('html-ppt-visual-invalid-');
  const deckPath = path.join(directory, 'deck.json');
  const deck = fixtureDeck();
  fs.writeFileSync(deckPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  writeSvg(path.join(directory, 'images', 'square.svg'), 1000, 1000);
  const plan = buildVisualWorkOrders(deck);
  Object.assign(plan.items[0], { status: 'ready', path: 'images/square.svg', alt: '' });
  const ratio = validateVisualWorkOrders(plan, { deck, deckPath, stage: 'delivery' });
  assert.ok(ratio.findings.some((finding) => finding.code === 'item.ratio-mismatch' && finding.level === 'error'));
  assert.ok(ratio.findings.some((finding) => finding.code === 'item.missing-alt' && finding.level === 'error'));
  plan.items[0].path = '../outside.svg';
  const escape = validateVisualWorkOrders(plan, { deck, deckPath, stage: 'delivery' });
  assert.ok(escape.findings.some((finding) => finding.code === 'item.path-escape'));
});

test('sync refuses deck mismatches and omitted slides', () => {
  const deck = fixtureDeck();
  const plan = buildVisualWorkOrders(deck);
  const wrongDeck = { ...deck, id: 'another-deck' };
  assert.throws(() => syncVisualWorkOrders(plan, wrongDeck), /belong to visual-production-fixture/);
  plan.items.pop();
  assert.throws(() => syncVisualWorkOrders(plan, deck), /omit deck slides: slide-03/);
});

test('work-order writer protects outputs unless force is supplied', () => {
  const directory = temporaryDirectory('html-ppt-visual-write-');
  const jsonPath = path.join(directory, 'qa', 'visual-work-orders.json');
  const markdownPath = path.join(directory, 'qa', 'visual-work-orders.md');
  const plan = buildVisualWorkOrders(fixtureDeck());
  writeVisualWorkOrders(plan, { jsonPath, markdownPath, manifestPath: path.join(directory, 'deck.json') });
  assert.ok(fs.existsSync(jsonPath));
  assert.ok(fs.existsSync(markdownPath));
  assert.throws(() => writeVisualWorkOrders(plan, { jsonPath, markdownPath }), /Refusing to overwrite/);
  writeVisualWorkOrders(plan, { jsonPath, markdownPath, force: true });
});

test('CLI builds, validates, and synchronizes work orders without changing slide structure', () => {
  const directory = temporaryDirectory('html-ppt-visual-cli-');
  const deckPath = path.join(directory, 'deck.json');
  const planPath = path.join(directory, 'qa', 'visual-work-orders.json');
  const markdownPath = path.join(directory, 'qa', 'visual-work-orders.md');
  const deck = fixtureDeck();
  fs.writeFileSync(deckPath, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  const build = runNode(['scripts/build-visual-work-orders.mjs', deckPath, '--output', planPath, '--markdown', markdownPath]);
  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
  const planning = runNode(['scripts/validate-visual-work-orders.mjs', planPath, '--deck', deckPath, '--stage', 'planning']);
  assert.equal(planning.status, 0, `${planning.stdout}\n${planning.stderr}`);
  const delivery = runNode(['scripts/validate-visual-work-orders.mjs', planPath, '--deck', deckPath, '--stage', 'delivery']);
  assert.notEqual(delivery.status, 0);

  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  writeSvg(path.join(directory, 'images', 'slide-01.svg'), 1600, 900);
  Object.assign(plan.items[0], {
    status: 'ready',
    path: 'images/slide-01.svg',
    alt: 'Context scene for the opening claim',
  });
  plan.stage = 'delivery';
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  const sync = runNode(['scripts/sync-visual-work-orders.mjs', planPath, '--deck', deckPath, '--stage', 'delivery', '--write']);
  assert.equal(sync.status, 0, `${sync.stdout}\n${sync.stderr}`);
  const updated = JSON.parse(fs.readFileSync(deckPath, 'utf8'));
  assert.deepEqual(updated.slides.map((slide) => ({ id: slide.id, layout: slide.layout })), deck.slides.map((slide) => ({ id: slide.id, layout: slide.layout })));
  const final = runNode(['scripts/validate-visual-work-orders.mjs', planPath, '--deck', deckPath, '--stage', 'delivery', '--strict']);
  assert.equal(final.status, 0, `${final.stdout}\n${final.stderr}`);
});

test('manifest validator distinguishes planning and delivery stages', () => {
  const directory = temporaryDirectory('html-ppt-manifest-stage-');
  const deckPath = path.join(directory, 'deck.json');
  fs.writeFileSync(deckPath, `${JSON.stringify(fixtureDeck(), null, 2)}\n`, 'utf8');
  const planning = runNode(['scripts/validate-manifest.mjs', deckPath, '--stage', 'planning']);
  assert.equal(planning.status, 0, `${planning.stdout}\n${planning.stderr}`);
  assert.match(planning.stdout, /WARN \[slide-01\] visual.required-not-ready/);
  const delivery = runNode(['scripts/validate-manifest.mjs', deckPath, '--stage', 'delivery']);
  assert.notEqual(delivery.status, 0);
  assert.match(delivery.stdout, /ERROR \[slide-01\] visual.required-not-ready/);
});
