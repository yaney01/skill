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
  await page.waitForFunction(() => Boolean(window.htmlPptEditor && window.htmlPptDeck));
  return { context, page };
}

async function enterEditMode(page) {
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.documentElement.classList.contains('html-ppt-editing'));
}

async function setText(page, locator, value) {
  await locator.evaluate((element, html) => {
    element.innerHTML = html;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: html }));
  }, value);
  await page.waitForTimeout(320);
}

async function editorState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem(window.htmlPptEditor.storageKey) || 'null'));
}

test('edit mode toggles stable text hooks', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('html-ppt-editing')), true);
    assert.equal(await page.locator('#deckStage [data-editable="text"]').first().getAttribute('contenteditable'), 'true');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('html-ppt-editing')), false);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('presenter preview frames do not initialize editor UI', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    const page = await context.newPage();
    await page.goto(`${fileUrl(bundled)}?htmlppt-presenter-preview=1#slide-1`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptEditor && window.htmlPptDeck));
    assert.equal(await page.locator('.editor-ui').count(), 0);
    assert.equal(await page.evaluate(() => window.htmlPptEditor.presenterPreview), true);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('legacy flat localStorage snapshots migrate to version 2 without losing image metadata', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    const details = await page.evaluate(() => {
      const text = document.querySelector('#deckStage [data-editable="text"][data-element-id]');
      const image = document.querySelector('#deckStage [data-editable="image"][data-element-id]');
      return {
        key: window.htmlPptEditor.storageKey,
        textId: text.dataset.elementId,
        imageId: image.dataset.elementId,
        imageSrc: image.getAttribute('src'),
        imageAlt: image.getAttribute('alt'),
      };
    });
    await page.evaluate((value) => {
      localStorage.setItem(value.key, JSON.stringify({
        [value.textId]: { type: 'text', html: '旧状态已迁移' },
        [value.imageId]: { type: 'image', src: value.imageSrc },
      }));
    }, details);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptEditor));

    const state = await editorState(page);
    assert.equal(state.version, 2);
    assert.equal(state.deckId, 'ai-ad-workflow-example');
    assert.equal(state.elements[details.textId].html, '旧状态已迁移');
    assert.equal(state.elements[details.imageId].alt, details.imageAlt);
    assert.equal(await page.locator(`#deckStage [data-element-id="${details.imageId}"]`).getAttribute('alt'), details.imageAlt);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('text edits persist in a versioned envelope and survive reload', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    const elementId = await editable.getAttribute('data-element-id');
    await setText(page, editable, '自动测试已保存');

    const saved = await editorState(page);
    assert.equal(saved.version, 2);
    assert.equal(saved.deckId, 'ai-ad-workflow-example');
    assert.match(saved.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(saved.elements[elementId].html, '自动测试已保存');

    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.htmlPptEditor));
    assert.equal(await page.locator(`#deckStage [data-element-id="${elementId}"]`).innerText(), '自动测试已保存');
    await context.close();
  } finally {
    await browser.close();
  }
});

test('undo and redo operate on committed editor transactions', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    await editable.click();
    await setText(page, editable, '版本 A');
    await setText(page, editable, '版本 B');

    await page.keyboard.press('Control+z');
    assert.equal(await editable.innerText(), '版本 A');
    assert.equal(await page.locator('[data-editor-action="redo"]').isDisabled(), false);

    await page.keyboard.press('Control+Shift+z');
    assert.equal(await editable.innerText(), '版本 B');
    await context.close();
  } finally {
    await browser.close();
  }
});

test('selected-element and current-slide reset preserve unrelated edits', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const first = page.locator('#deckStage .slide.active [data-editable="text"][data-element-id]').nth(0);
    const second = page.locator('#deckStage .slide.active [data-editable="text"][data-element-id]').nth(1);
    const originalFirst = await first.innerHTML();
    const originalSecond = await second.innerHTML();
    await setText(page, first, '元素一已修改');
    await setText(page, second, '元素二已修改');

    const firstId = await first.getAttribute('data-element-id');
    await first.dispatchEvent('click');
    await page.waitForFunction((id) => window.htmlPptEditor.selected?.dataset.elementId === id, firstId);
    const resetElement = page.locator('[data-editor-action="reset-element"]');
    assert.equal(await resetElement.isDisabled(), false);
    await resetElement.click();
    await page.waitForFunction(({ id, html }) => document.querySelector(`[data-element-id="${id}"]`)?.innerHTML === html, { id: firstId, html: originalFirst });
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerText(), '元素二已修改');

    await page.locator('[data-editor-action="reset-slide"]').click();
    await page.waitForFunction(({ firstId, firstHtml, secondId, secondHtml }) => {
      return document.querySelector(`[data-element-id="${firstId}"]`)?.innerHTML === firstHtml
        && document.querySelector(`[data-element-id="${secondId}"]`)?.innerHTML === secondHtml;
    }, {
      firstId,
      firstHtml: originalFirst,
      secondId: await second.getAttribute('data-element-id'),
      secondHtml: originalSecond,
    });
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerHTML(), originalSecond);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('image replacement, fit, focus, and alt text persist together', async () => {
  const bundled = bundleExample();
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const image = page.locator('#deckStage [data-editable="image"][data-element-id]').first();
    const elementId = await image.getAttribute('data-element-id');
    await image.evaluate((element) => {
      const slides = [...document.querySelectorAll('#deckStage .slide')];
      window.htmlPptDeck.show(slides.indexOf(element.closest('.slide')));
    });
    await image.waitFor({ state: 'visible' });
    await image.click();

    await page.locator('[data-editor-property="fit"]').selectOption('contain');
    await page.locator('[data-editor-property="focus"]').selectOption('100% 100%');
    page.once('dialog', (dialog) => dialog.accept('替换后的流程图说明'));
    await page.locator('[data-editor-action="edit-alt"]').click();

    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-editor-action="replace-image"]').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'replacement.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="red"/></svg>'),
    });
    await page.waitForFunction((id) => document.querySelector(`#deckStage [data-element-id="${id}"]`)?.getAttribute('src')?.startsWith('data:image/svg+xml;base64,'), elementId);

    const saved = (await editorState(page)).elements[elementId];
    assert.match(saved.src, /^data:image\/svg\+xml;base64,/);
    assert.equal(saved.fit, 'contain');
    assert.equal(saved.focus, '100% 100%');
    assert.equal(saved.alt, '替换后的流程图说明');
    assert.equal(await image.evaluate((element) => getComputedStyle(element).objectFit), 'contain');
    assert.equal(await image.evaluate((element) => getComputedStyle(element).objectPosition), '100% 100%');
    assert.equal(await image.getAttribute('alt'), '替换后的流程图说明');
    await context.close();
  } finally {
    await browser.close();
  }
});

test('edit-state JSON export and sanitized import round-trip', async () => {
  const directory = temporaryDirectory('html-ppt-state-');
  const bundled = bundleExample(directory);
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    const elementId = await editable.getAttribute('data-element-id');
    await setText(page, editable, '导出版本');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-editor-action="export-state"]').click(),
    ]);
    const statePath = path.join(directory, download.suggestedFilename());
    await download.saveAs(statePath);
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.version, 2);
    assert.equal(state.deckId, 'ai-ad-workflow-example');
    assert.equal(state.elements[elementId].html, '导出版本');

    await setText(page, editable, '导入前版本');
    state.elements[elementId].html = '<strong>导入完成</strong><script>window.bad=true</script><span onclick="window.bad=true">安全文本</span>';
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-editor-action="import-state"]').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'edits.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(state)),
    });
    await page.waitForFunction((id) => document.querySelector(`#deckStage [data-element-id="${id}"]`)?.textContent.includes('导入完成'), elementId);
    assert.equal(await editable.locator('script').count(), 0);
    assert.equal(await editable.locator('[onclick]').count(), 0);
    assert.equal(await page.evaluate(() => window.bad), undefined);
    await context.close();
  } finally {
    await browser.close();
  }
});

test('Ctrl+S downloads edited HTML without editor state or runtime UI', async () => {
  const directory = temporaryDirectory('html-ppt-download-');
  const bundled = bundleExample(directory);
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openBundledPage(browser, bundled);
    await enterEditMode(page);
    const editable = page.locator('#deckStage [data-editable="text"][data-element-id]').first();
    await setText(page, editable, '下载内容已更新');

    const image = page.locator('#deckStage [data-editable="image"][data-element-id]').first();
    await image.evaluate((element) => {
      const slides = [...document.querySelectorAll('#deckStage .slide')];
      window.htmlPptDeck.show(slides.indexOf(element.closest('.slide')));
    });
    await image.waitFor({ state: 'visible' });
    await image.click();
    await page.locator('[data-editor-property="fit"]').selectOption('contain');
    await page.locator('[data-editor-property="focus"]').selectOption('50% 100%');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Control+s'),
    ]);
    const downloadPath = path.join(directory, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const html = fs.readFileSync(downloadPath, 'utf8');

    assert.match(download.suggestedFilename(), /\.html$/);
    assert.match(html, /下载内容已更新/);
    assert.match(html, /data-fit="contain"/);
    assert.match(html, /data-focus="50% 100%"/);
    assert.match(html, /id="deckManifest"/);
    assert.doesNotMatch(html, /contenteditable=/);
    assert.doesNotMatch(html, /spellcheck=/);
    assert.doesNotMatch(html, /class="editor-ui/);
    assert.doesNotMatch(html, /<[^>]+\bclass="[^"]*\bhtml-ppt-selected\b/);
    assert.doesNotMatch(html, /<[^>]+\bdata-presenter-overview(?:\s|=|>)/);
    assert.doesNotMatch(html, /(?:src|href)="(?:\.\.\/|\.\/|images\/)/);
    await context.close();
  } finally {
    await browser.close();
  }
});
