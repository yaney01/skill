import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { bundleExample, fileUrl } from './helpers.mjs';

async function openBundledAudience(browser) {
  const bundled = bundleExample();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(fileUrl(bundled), { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.htmlPptDeck && window.htmlPptPresenter?.ready));
  await page.evaluate(() => window.htmlPptPresenter.ready);
  return { context, page, bundled };
}

test('Escape overview and G jump navigate the audience deck', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledAudience(browser);
    await page.keyboard.press('Escape');
    await page.locator('.html-ppt-overview.open').waitFor();
    assert.equal(await page.locator('.html-ppt-overview-grid button').count(), 12);

    await page.locator('.html-ppt-overview-grid button').nth(4).click();
    await page.waitForFunction(() => window.htmlPptDeck.index === 4);
    assert.equal(await page.locator('.html-ppt-overview.open').count(), 0);

    page.once('dialog', (dialog) => dialog.accept('7'));
    await page.keyboard.press('g');
    await page.waitForFunction(() => window.htmlPptDeck.index === 6);
    assert.equal(await page.locator('.slide.active').getAttribute('data-slide-id'), 'slide-07');
    await context.close();
  } finally {
    await browser.close();
  }
});

test('P opens a synchronized presenter window with notes, previews, timer, and refresh recovery', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledAudience(browser);
    const popupPromise = context.waitForEvent('page');
    await page.keyboard.press('p');
    const presenter = await popupPromise;
    await presenter.waitForLoadState('load');
    await presenter.waitForFunction(() => Boolean(window.htmlPptPresenter?.ui));

    assert.equal(await presenter.locator('.html-ppt-presenter-preview').count(), 2);
    assert.match(await presenter.locator('.html-ppt-presenter-notes p').innerText(), /单纯的 AI 出图分享/);
    assert.match(await presenter.locator('.html-ppt-presenter-ui time').innerText(), /^\d{2}:\d{2}$/);
    assert.equal(await page.locator('.html-ppt-presenter-ui').count(), 0);

    await presenter.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.htmlPptDeck.index === 1);
    assert.equal(await page.locator('.slide.active').getAttribute('data-slide-id'), 'slide-02');

    await page.bringToFront();
    await page.keyboard.press('End');
    await presenter.waitForFunction(() => window.htmlPptPresenter.index === 11);
    assert.match(await presenter.locator('.html-ppt-presenter-notes p').innerText(), /四项行动/);
    assert.equal(await presenter.locator('.html-ppt-presenter-notes .counter').innerText(), '12 / 12');

    await presenter.reload({ waitUntil: 'load' });
    await presenter.waitForFunction(() => Boolean(window.htmlPptPresenter?.ui));
    await presenter.waitForFunction(() => window.htmlPptPresenter.index === 11, null, { timeout: 7000 });
    assert.equal(await presenter.locator('.html-ppt-presenter-notes .counter').innerText(), '12 / 12');

    await presenter.close();
    assert.equal(await page.evaluate(() => window.htmlPptDeck.index), 11);
    await context.close();
  } finally {
    await browser.close();
  }
});
