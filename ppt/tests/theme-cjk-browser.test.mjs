import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { selectedBrowserName, selectedBrowserType } from '../scripts/lib/browser-launcher.mjs';
import { fileUrl, pptRoot } from './helpers.mjs';

const browserName = selectedBrowserName();
const cases = [
  { id: 'cobalt-executive-deck', prefix: 'cobalt', displaySize: 90, titleSize: 58 },
  { id: 'coral-startup-deck', prefix: 'coral', displaySize: 90, titleSize: 58 },
  { id: 'ribbon-tab-brochure', prefix: 'ribbon', displaySize: 86, titleSize: 56 },
  { id: 'blue-growth-deck', prefix: 'growth', displaySize: 96, titleSize: 60 },
];

function ratio(value, base) {
  return Number.parseFloat(value) / Number.parseFloat(base);
}

function trackingRatio(value, base) {
  return value === 'normal' ? 0 : ratio(value, base);
}

function closeTo(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}±${tolerance}, got ${actual}`);
}

test(`${browserName} applies Chinese display, title, body, and metadata rules to the four composition themes`, async () => {
  const browser = await selectedBrowserType(browserName).launch({ headless: true });
  const reports = [];
  const reportPath = path.join(pptRoot, 'qa', 'ci', `theme-cjk-${browserName}.json`);
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    for (const theme of cases) {
      const page = await context.newPage();
      const preview = path.join(pptRoot, 'assets', 'themes', theme.id, 'preview.html');
      await page.goto(fileUrl(preview), { waitUntil: 'load' });

      const styles = await page.evaluate(({ prefix }) => {
        const inspect = (selector) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing typography fixture: ${selector}`);
          const style = getComputedStyle(element);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            lineHeight: style.lineHeight,
            lineBreak: style.lineBreak,
            wordBreak: style.wordBreak,
          };
        };
        return {
          root: inspect(`.${prefix}-shell`),
          display: inspect(`.${prefix}-display`),
          title: inspect(`.${prefix}-title`),
          body: inspect(`.${prefix}-copy`),
          meta: inspect(`.${prefix}-kicker`),
        };
      }, { prefix: theme.prefix });

      reports.push({ theme: theme.id, expected: theme, styles });
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');

      assert.equal(Number.parseFloat(styles.display.fontSize), theme.displaySize, `${theme.id} display size`);
      assert.equal(Number.parseFloat(styles.title.fontSize), theme.titleSize, `${theme.id} title size`);
      assert.equal(Number.parseInt(styles.display.fontWeight, 10), 800, `${theme.id} display weight`);
      assert.equal(Number.parseInt(styles.title.fontWeight, 10), 800, `${theme.id} title weight`);
      assert.equal(Number.parseInt(styles.meta.fontWeight, 10), 600, `${theme.id} metadata weight`);

      closeTo(ratio(styles.display.lineHeight, styles.display.fontSize), 1.04, 0.01, `${theme.id} display line-height ratio`);
      closeTo(ratio(styles.title.lineHeight, styles.title.fontSize), 1.12, 0.01, `${theme.id} title line-height ratio`);
      closeTo(ratio(styles.body.lineHeight, styles.body.fontSize), 1.65, 0.01, `${theme.id} body line-height ratio`);
      closeTo(ratio(styles.meta.lineHeight, styles.meta.fontSize), 1.35, 0.01, `${theme.id} metadata line-height ratio`);

      closeTo(trackingRatio(styles.display.letterSpacing, styles.display.fontSize), -0.005, 0.001, `${theme.id} display tracking ratio`);
      closeTo(trackingRatio(styles.title.letterSpacing, styles.title.fontSize), 0, 0.001, `${theme.id} title tracking ratio`);
      closeTo(trackingRatio(styles.body.letterSpacing, styles.body.fontSize), 0.01, 0.001, `${theme.id} body tracking ratio`);
      closeTo(trackingRatio(styles.meta.letterSpacing, styles.meta.fontSize), 0.08, 0.002, `${theme.id} metadata tracking ratio`);

      assert.match(styles.display.fontFamily, /Noto Sans SC/, `${theme.id} display CJK stack`);
      assert.match(styles.body.fontFamily, /Noto Sans SC/, `${theme.id} body CJK stack`);
      assert.match(styles.meta.fontFamily, /IBM Plex Mono/, `${theme.id} metadata stack`);
      assert.equal(styles.root.lineBreak, 'strict', `${theme.id} strict line breaking`);
      assert.equal(styles.root.wordBreak, 'normal', `${theme.id} word breaking`);
      await page.close();
    }
    await context.close();
  } finally {
    await browser.close();
  }
});
