import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { auditAccessibilityPage } from '../scripts/lib/accessibility-audit.mjs';
import { selectedBrowserName, selectedBrowserType } from '../scripts/lib/browser-launcher.mjs';
import { fileUrl, temporaryDirectory } from './helpers.mjs';

const browserName = selectedBrowserName();

async function auditFixture(html) {
  const directory = temporaryDirectory('html-ppt-a11y-');
  const file = path.join(directory, 'index.html');
  fs.writeFileSync(file, html, 'utf8');
  const browser = await selectedBrowserType(browserName).launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(fileUrl(file), { waitUntil: 'load' });
    return await auditAccessibilityPage(page);
  } finally {
    await browser.close();
  }
}

test(`${browserName} accessibility audit accepts the fixed-stage semantic contract`, async () => {
  const report = await auditFixture(`<!doctype html>
<html lang="en"><head><title>Accessible deck</title><style>
body{background:#fff;color:#111}.slide{position:absolute;width:1920px;height:1080px}.slide[aria-hidden="true"]{display:none}
</style></head><body>
<main id="deckStage" class="deck-stage">
<section class="slide active" data-slide-id="slide-01" aria-hidden="false"><h1>Title</h1><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Evidence diagram"><button aria-label="Next slide">→</button></section>
<section class="slide" data-slide-id="slide-02" aria-hidden="true"><h2>Second slide</h2></section>
</main></body></html>`);
  assert.equal(report.summary.errors, 0);
});

test(`${browserName} accessibility audit reports blocking document and control defects`, async () => {
  const report = await auditFixture(`<!doctype html>
<html><head><title></title></head><body>
<main id="deckStage" class="deck-stage">
<section id="duplicate" class="slide active" aria-hidden="true"><p>No heading</p><img src="missing.png"><button></button></section>
<section id="duplicate" class="slide" data-slide-id="slide-02" aria-hidden="false"><h2>Second</h2></section>
</main></body></html>`);
  const codes = new Set(report.findings.filter((finding) => finding.severity === 'error').map((finding) => finding.code));
  for (const code of ['document.lang-missing', 'document.title-missing', 'document.duplicate-id', 'slide.id-missing', 'slide.active-hidden', 'slide.inactive-exposed', 'image.alt-missing', 'control.name-missing']) {
    assert.equal(codes.has(code), true, `Expected ${code}`);
  }
});
