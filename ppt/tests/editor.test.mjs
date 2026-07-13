import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { bundleExample, fileUrl, temporaryDirectory } from './helpers.mjs';

async function openBundledPage(browser, bundled) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto(fileUrl(bundled), { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.htmlPptEditor && window.htmlPptDeck && window.htmlPptPresenter?.ready));
  await page.evaluate(() => window.htmlPptPresenter.ready);
  return { context, page };
}

test('edit mode toggles stable text hooks', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await page.keyboard.press('e');
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('html-ppt-editing')), true);
    assert.equal(await page.locator('[data-editable="text"]').first().getAttribute('contenteditable'), 'true');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('html-ppt-editing')), false);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('text edits persist through localStorage and reload', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await page.keyboard.press('e');
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    const elementId = await editable.getAttribute('data-element-id');
    await editable.evaluate((element) => {
      element.innerHTML = '自动测试已保存';
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '自动测试已保存' }));
    });
    await page.waitForTimeout(350);

    const saved = await page.evaluate((id) => {
      const key = window.htmlPptEditor.storageKey;
      return JSON.parse(localStorage.getItem(key) || '{}')[id];
    }, elementId);
    assert.equal(saved.html, '自动测试已保存');

    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptEditor));
    assert.equal(await page.locator(`#deckStage [data-element-id="${elementId}"]`).innerText(), '自动测试已保存');
    await context.close();
  } finally {
    await browser.close();
  }
});

test('image replacement is saved as an embedded data URL', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await page.keyboard.press('e');
    const image = page.locator('#deckStage [data-editable="image"][data-element-id]').first();
    const elementId = await image.getAttribute('data-element-id');

    await image.evaluate((element) => {
      const slide = element.closest('.slide');
      const slides = [...document.querySelectorAll('#deckStage .slide')];
      window.htmlPptDeck.show(slides.indexOf(slide));
    });
    await image.waitFor({ state: 'visible' });

    const chooserPromise = page.waitForEvent('filechooser');
    await image.click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'replacement.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>'),
    });
    await page.waitForFunction((id) => document.querySelector(`#deckStage [data-element-id="${id}"]`)?.getAttribute('src')?.startsWith('data:image/svg+xml;base64,'), elementId);

    const saved = await page.evaluate((id) => {
      const key = window.htmlPptEditor.storageKey;
      return JSON.parse(localStorage.getItem(key) || '{}')[id];
    }, elementId);
    assert.match(saved.src, /^data:image\/svg\+xml;base64,/);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('Ctrl+S downloads a self-contained edited HTML document without runtime presenter UI clones', async () => {
  const directory = temporaryDirectory('html-ppt-download-');
  const bundled = bundleExample(directory);
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await page.keyboard.press('e');
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    await editable.evaluate((element) => {
      element.innerHTML = '下载内容已更新';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(350);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+s'),
    ]);
    const downloadPath = path.join(directory, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const html = fs.readFileSync(downloadPath, 'utf8');

    assert.match(download.suggestedFilename(), /\.html$/);
    assert.match(html, /下载内容已更新/);
    assert.match(html, /id="htmlPptManifest"/);
    assert.doesNotMatch(html, /contenteditable=/);
    assert.doesNotMatch(html, /class="editor-ui/);
    assert.doesNotMatch(html, /class="html-ppt-overview/);
    assert.doesNotMatch(html, /class="html-ppt-presenter-ui/);
    assert.doesNotMatch(html, /data-presenter-runtime/);
    assert.doesNotMatch(html, /(?:src|href)="(?:\.\.\/|\.\/|images\/)/);
    await context.close();
  } finally {
    await browser.close();
  }
});
