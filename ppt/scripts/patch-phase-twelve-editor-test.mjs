#!/usr/bin/env node
import fs from 'node:fs';

const fileUrl = new URL('../tests/editor.test.mjs', import.meta.url);
const source = fs.readFileSync(fileUrl, 'utf8');
const before = `    await first.click();
    await page.locator('[data-editor-action="reset-element"]').click();
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerText(), '元素二已修改');

    await page.locator('[data-editor-action="reset-slide"]').click();
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerHTML(), originalSecond);`;
const after = `    const firstId = await first.getAttribute('data-element-id');
    await first.dispatchEvent('click');
    await page.waitForFunction((id) => window.htmlPptEditor.selected?.dataset.elementId === id, firstId);
    const resetElement = page.locator('[data-editor-action="reset-element"]');
    assert.equal(await resetElement.isDisabled(), false);
    await resetElement.click();
    await page.waitForFunction(({ id, html }) => document.querySelector(\`[data-element-id="\${id}"]\`)?.innerHTML === html, { id: firstId, html: originalFirst });
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerText(), '元素二已修改');

    await page.locator('[data-editor-action="reset-slide"]').click();
    await page.waitForFunction(({ firstId, firstHtml, secondId, secondHtml }) => {
      return document.querySelector(\`[data-element-id="\${firstId}"]\`)?.innerHTML === firstHtml
        && document.querySelector(\`[data-element-id="\${secondId}"]\`)?.innerHTML === secondHtml;
    }, {
      firstId,
      firstHtml: originalFirst,
      secondId: await second.getAttribute('data-element-id'),
      secondHtml: originalSecond,
    });
    assert.equal(await first.innerHTML(), originalFirst);
    assert.equal(await second.innerHTML(), originalSecond);`;

if (source.includes(after)) {
  console.log('Editor reset test patch already applied.');
} else {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one editor reset test fragment, found ${count}.`);
  fs.writeFileSync(fileUrl, source.replace(before, after), 'utf8');
  console.log('Editor reset test patch applied.');
}
