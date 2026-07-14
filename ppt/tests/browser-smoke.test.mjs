import assert from 'node:assert/strict';
import test from 'node:test';
import { selectedBrowserName, selectedBrowserType } from '../scripts/lib/browser-launcher.mjs';
import { bundleExample, fileUrl } from './helpers.mjs';

const browserName = selectedBrowserName();

test(`${browserName} opens the bundled deck and preserves core playback and editing`, async () => {
  const bundled = bundleExample();
  const browser = await selectedBrowserType(browserName).launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(fileUrl(bundled), { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptDeck && window.htmlPptEditor));

    const initial = await page.evaluate(() => ({
      slides: document.querySelectorAll('.slide').length,
      active: [...document.querySelectorAll('.slide')].findIndex((slide) => slide.classList.contains('active')),
      hidden: [...document.querySelectorAll('.slide')].map((slide) => slide.getAttribute('aria-hidden')),
    }));
    assert.ok(initial.slides >= 2);
    assert.equal(initial.active, 0);
    assert.equal(initial.hidden[0], 'false');
    assert.ok(initial.hidden.slice(1).every((value) => value === 'true'));

    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => [...document.querySelectorAll('.slide')].findIndex((slide) => slide.classList.contains('active')) === 1);
    assert.equal(await page.evaluate(() => location.hash), '#slide-2');

    await page.keyboard.press('Home');
    await page.waitForFunction(() => [...document.querySelectorAll('.slide')].findIndex((slide) => slide.classList.contains('active')) === 0);

    await page.keyboard.press('e');
    await page.waitForFunction(() => document.documentElement.classList.contains('html-ppt-editing'));
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    assert.equal(await editable.getAttribute('contenteditable'), 'true');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.documentElement.classList.contains('html-ppt-editing'));
    assert.equal(await editable.getAttribute('contenteditable'), 'false');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    assert.deepEqual(pageErrors, []);
    await context.close();
  } finally {
    await browser.close();
  }
});
