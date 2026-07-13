import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { exampleHtml, fileUrl } from './helpers.mjs';

async function openPage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ...options,
  });
  const page = await context.newPage();
  await page.goto(fileUrl(exampleHtml), { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.htmlPptDeck));
  return { context, page };
}

test('the fixed stage and initial slide state are stable', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openPage(browser);
    const state = await page.evaluate(() => {
      const stage = document.querySelector('.deck-stage');
      const active = [...document.querySelectorAll('.slide.active')];
      return {
        width: getComputedStyle(stage).width,
        height: getComputedStyle(stage).height,
        slideCount: document.querySelectorAll('.slide').length,
        activeCount: active.length,
        activeId: active[0]?.dataset.slideId,
      };
    });
    assert.deepEqual(state, {
      width: '1920px',
      height: '1080px',
      slideCount: 12,
      activeCount: 1,
      activeId: 'slide-01',
    });
    await context.close();
  } finally {
    await browser.close();
  }
});

test('keyboard, hash, and wheel navigation update one active slide', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openPage(browser);

    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.htmlPptDeck.index === 1);
    assert.equal(await page.evaluate(() => location.hash), '#slide-2');

    await page.keyboard.press('End');
    await page.waitForFunction(() => window.htmlPptDeck.index === 11);
    assert.equal(await page.locator('.slide.active').getAttribute('data-slide-id'), 'slide-12');

    await page.keyboard.press('Home');
    await page.waitForFunction(() => window.htmlPptDeck.index === 0);
    await page.mouse.wheel(0, 900);
    await page.waitForFunction(() => window.htmlPptDeck.index === 1);

    assert.equal(await page.locator('.slide.active').count(), 1);
    await context.close();

    const hashContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hashPage = await hashContext.newPage();
    await hashPage.goto(fileUrl(exampleHtml, '#slide-5'), { waitUntil: 'load' });
    await hashPage.waitForFunction(() => window.htmlPptDeck?.index === 4);
    assert.equal(await hashPage.locator('.slide.active').getAttribute('data-slide-id'), 'slide-05');
    await hashContext.close();
  } finally {
    await browser.close();
  }
});

test('mobile view scales the whole 1920×1080 stage without reflow', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openPage(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });

    const result = await page.evaluate(() => {
      const stage = document.querySelector('.deck-stage');
      return {
        width: getComputedStyle(stage).width,
        height: getComputedStyle(stage).height,
        transform: stage.style.transform,
        overflowX: getComputedStyle(document.body).overflowX,
        overflowY: getComputedStyle(document.body).overflowY,
      };
    });

    assert.equal(result.width, '1920px');
    assert.equal(result.height, '1080px');
    assert.match(result.transform, /scale\(0\.203125\)/);
    assert.equal(result.overflowX, 'hidden');
    assert.equal(result.overflowY, 'hidden');
    await context.close();
  } finally {
    await browser.close();
  }
});
