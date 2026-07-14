import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { selectedBrowserName, selectedBrowserType } from '../scripts/lib/browser-launcher.mjs';
import { fileUrl, pptRoot } from './helpers.mjs';

const browserName = selectedBrowserName();
const cases = [
  { id: 'cobalt-executive-deck', prefix: 'cobalt' },
  { id: 'coral-startup-deck', prefix: 'coral' },
  { id: 'ribbon-tab-brochure', prefix: 'ribbon' },
  { id: 'blue-growth-deck', prefix: 'growth' },
];
const guizang = {
  displaySize: 116,
  titleSize: 76,
  bodySize: 30,
  metaSize: 20,
};

function ratio(value, base) {
  return Number.parseFloat(value) / Number.parseFloat(base);
}

function trackingRatio(value, base) {
  return value === 'normal' ? 0 : ratio(value, base);
}

function closeTo(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}±${tolerance}, got ${actual}`);
}

test(`${browserName} applies the Guizang Chinese hierarchy to the four composition themes`, async () => {
  const browser = await selectedBrowserType(browserName).launch({ headless: true });
  const reports = [];
  const reportPath = path.join(pptRoot, 'qa', 'ci', `theme-cjk-${browserName}.json`);
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    for (const theme of cases) {
      const page = await context.newPage();
      const preview = path.join(pptRoot, 'assets', 'themes', theme.id, 'preview.html');
      await page.goto(fileUrl(preview), { waitUntil: 'load' });

      const report = await page.evaluate(({ prefix }) => {
        const inspect = (selector) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing typography fixture: ${selector}`);
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            lineHeight: style.lineHeight,
            lineBreak: style.lineBreak,
            wordBreak: style.wordBreak,
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
          };
        };

        const displayElement = document.querySelector(`.${prefix}-display`);
        const titleElement = document.querySelector(`.${prefix}-title`);
        const displaySlide = displayElement?.closest('.slide');
        const titleSlide = titleElement?.closest('.slide');
        const displayBody = displaySlide?.querySelector(`.${prefix}-copy`);
        const titleBody = titleSlide?.querySelector(`.${prefix}-copy`);
        const gap = (first, second) => {
          if (!first || !second) return null;
          return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
        };

        const overflow = [];
        for (const slide of document.querySelectorAll('.slide')) {
          const slideRect = slide.getBoundingClientRect();
          const selectors = [
            '[data-editable="text"]',
            `.${prefix}-kicker`,
            `.${prefix}-folio`,
            `.${prefix}-topbar`,
            `.${prefix}-bottombar`,
            `.${prefix}-tabs`,
          ].join(',');
          for (const element of slide.querySelectorAll(selectors)) {
            if (!element.textContent.trim() || getComputedStyle(element).display === 'none') continue;
            const rect = element.getBoundingClientRect();
            const tolerance = 1;
            if (
              rect.left < slideRect.left - tolerance
              || rect.top < slideRect.top - tolerance
              || rect.right > slideRect.right + tolerance
              || rect.bottom > slideRect.bottom + tolerance
            ) {
              overflow.push({
                slide: slide.dataset.slideId,
                element: element.getAttribute('data-element-id') || element.className || element.tagName,
                rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
                slideRect: { left: slideRect.left, top: slideRect.top, right: slideRect.right, bottom: slideRect.bottom },
              });
            }
          }
        }

        return {
          root: inspect(`.${prefix}-shell`),
          display: inspect(`.${prefix}-display`),
          title: inspect(`.${prefix}-title`),
          body: inspect(`.${prefix}-copy`),
          meta: inspect(`.${prefix}-kicker`),
          displayBodyGap: gap(displayElement, displayBody),
          titleBodyGap: gap(titleElement, titleBody),
          overflow,
        };
      }, { prefix: theme.prefix });

      reports.push({ theme: theme.id, expected: guizang, report });
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');

      assert.equal(Number.parseFloat(report.display.fontSize), guizang.displaySize, `${theme.id} display size`);
      assert.equal(Number.parseFloat(report.title.fontSize), guizang.titleSize, `${theme.id} title size`);
      assert.equal(Number.parseFloat(report.body.fontSize), guizang.bodySize, `${theme.id} body size`);
      assert.equal(Number.parseFloat(report.meta.fontSize), guizang.metaSize, `${theme.id} metadata size`);
      assert.equal(Number.parseInt(report.display.fontWeight, 10), 900, `${theme.id} display weight`);
      assert.equal(Number.parseInt(report.title.fontWeight, 10), 900, `${theme.id} title weight`);
      assert.equal(Number.parseInt(report.body.fontWeight, 10), 500, `${theme.id} body weight`);
      assert.equal(Number.parseInt(report.meta.fontWeight, 10), 700, `${theme.id} metadata weight`);

      closeTo(ratio(report.display.lineHeight, report.display.fontSize), 1.04, 0.01, `${theme.id} display line-height ratio`);
      closeTo(ratio(report.title.lineHeight, report.title.fontSize), 1.12, 0.01, `${theme.id} title line-height ratio`);
      closeTo(ratio(report.body.lineHeight, report.body.fontSize), 1.65, 0.01, `${theme.id} body line-height ratio`);
      closeTo(ratio(report.meta.lineHeight, report.meta.fontSize), 1.35, 0.01, `${theme.id} metadata line-height ratio`);

      closeTo(trackingRatio(report.display.letterSpacing, report.display.fontSize), -0.005, 0.001, `${theme.id} display tracking ratio`);
      closeTo(trackingRatio(report.title.letterSpacing, report.title.fontSize), -0.005, 0.001, `${theme.id} title tracking ratio`);
      closeTo(trackingRatio(report.body.letterSpacing, report.body.fontSize), 0.01, 0.001, `${theme.id} body tracking ratio`);
      closeTo(trackingRatio(report.meta.letterSpacing, report.meta.fontSize), 0.08, 0.002, `${theme.id} metadata tracking ratio`);

      assert.match(report.display.fontFamily, /Noto Sans SC/, `${theme.id} display CJK stack`);
      assert.match(report.body.fontFamily, /Noto Sans SC/, `${theme.id} body CJK stack`);
      assert.match(report.meta.fontFamily, /IBM Plex Mono/, `${theme.id} metadata stack`);
      assert.equal(report.root.lineBreak, 'strict', `${theme.id} strict line breaking`);
      assert.equal(report.root.wordBreak, 'normal', `${theme.id} word breaking`);
      assert.ok(report.displayBodyGap >= 24, `${theme.id} display-to-body gap is too small: ${report.displayBodyGap}px`);
      if (report.titleBodyGap !== null) assert.ok(report.titleBodyGap >= 18, `${theme.id} title-to-body gap is too small: ${report.titleBodyGap}px`);
      assert.deepEqual(report.overflow, [], `${theme.id} has text outside the 1920×1080 slide`);
      await page.close();
    }
    await context.close();
  } finally {
    await browser.close();
  }
});
