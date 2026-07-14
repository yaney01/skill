import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { fileUrl, pptRoot, runNode, temporaryDirectory, combinedOutput } from './helpers.mjs';

function buildPresenterFixture() {
  const directory = temporaryDirectory('html-ppt-presenter-');
  const runtimeDirectory = path.join(directory, 'runtime');
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  fs.copyFileSync(path.join(pptRoot, 'assets', 'runtime', 'deck-runtime.js'), path.join(runtimeDirectory, 'deck-runtime.js'));
  fs.writeFileSync(path.join(directory, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}.deck-stage{position:absolute;width:1920px;height:1080px;transform-origin:0 0}.slide{position:absolute;inset:0;visibility:hidden;background:white}.slide.active,.slide.visible{visibility:visible}</style></head><body><main id="deckStage" class="deck-stage" data-deck-id="presenter-fixture"><section class="slide active visible" data-slide-id="slide-01"><h1>Opening</h1></section><section class="slide" data-slide-id="slide-02" aria-hidden="true"><h1>Evidence</h1></section><section class="slide" data-slide-id="slide-03" aria-hidden="true"><h1>Close</h1></section></main><script src="runtime/deck-runtime.js"></script></body></html>`);
  fs.writeFileSync(path.join(directory, 'deck.json'), JSON.stringify({
    manifestVersion: 2,
    id: 'presenter-fixture',
    title: 'Presenter Fixture',
    language: 'en',
    density: 'speaker-led',
    visualStrategy: { mode: 'typography-led', targetCoverage: 0, targetEvidenceCoverage: 0, maxConsecutiveTextOnly: 3 },
    slides: [
      { id: 'slide-01', purpose: 'hook', layout: 'cover', headline: 'Opening', notes: 'Introduce the decision.', visual: { type: 'typographic', required: false, status: 'ready', source: 'css', role: 'typography' } },
      { id: 'slide-02', purpose: 'evidence', layout: 'chart', headline: 'Evidence', notes: 'Explain the supporting evidence.', visual: { type: 'data-chart', required: false, status: 'ready', source: 'chart', role: 'evidence' } },
      { id: 'slide-03', purpose: 'close', layout: 'closing', headline: 'Close', notes: 'Ask for the decision.', visual: { type: 'typographic', required: false, status: 'ready', source: 'css', role: 'typography' } },
    ],
  }, null, 2));
  const bundled = path.join(directory, 'presenter.html');
  const result = runNode(['scripts/bundle-html.mjs', path.join(directory, 'index.html'), bundled]);
  assert.equal(result.status, 0, combinedOutput(result));
  return { directory, bundled };
}

test('bundled presenter mode loads notes and synchronizes both directions', async () => {
  const { bundled } = buildPresenterFixture();
  const bundledHtml = fs.readFileSync(bundled, 'utf8');
  assert.match(bundledHtml, /id="deckManifest"/);
  assert.match(bundledHtml, /Introduce the decision/);
  assert.doesNotMatch(bundledHtml, /src=["']deck\.json/);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const deckJsonRequests = [];
    page.on('request', (request) => {
      if (/\/deck\.json(?:[?#]|$)/.test(request.url())) deckJsonRequests.push(request.url());
    });
    await page.goto(fileUrl(bundled), { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptDeck));

    const popupPromise = page.waitForEvent('popup');
    await page.keyboard.press('p');
    const presenter = await popupPromise;
    await presenter.waitForSelector('#position');
    await presenter.waitForFunction(() => document.querySelector('#position')?.textContent === '1 / 3');
    assert.equal(await presenter.locator('#notes').textContent(), 'Introduce the decision.');
    assert.deepEqual(deckJsonRequests, [], 'Bundled decks must use the embedded manifest without requesting deck.json.');

    await presenter.locator('[data-c="next"]').click();
    await page.waitForFunction(() => window.htmlPptDeck.index === 1);
    await presenter.waitForFunction(() => document.querySelector('#position')?.textContent === '2 / 3');
    assert.equal(await presenter.locator('#notes').textContent(), 'Explain the supporting evidence.');

    await page.keyboard.press('ArrowRight');
    await presenter.waitForFunction(() => document.querySelector('#position')?.textContent === '3 / 3');
    assert.equal(await presenter.locator('#notes').textContent(), 'Ask for the decision.');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-presenter-overview="true"]').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-presenter-overview="true"]').count(), 0);

    page.once('dialog', (dialog) => dialog.accept('2'));
    await page.keyboard.press('g');
    await page.waitForFunction(() => window.htmlPptDeck.index === 1);
    await context.close();
  } finally {
    await browser.close();
  }
});
