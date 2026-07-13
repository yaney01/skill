#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const input = process.argv[2];
const outputArg = process.argv[3];

if (!input) {
  console.error('Usage: node scripts/export-pdf.mjs deck.html [output.pdf]');
  process.exit(2);
}

const absolute = path.resolve(input);
if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(2);
}

const output = path.resolve(outputArg || absolute.replace(/\.html?$/i, '.pdf'));
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(absolute).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  await page.pdf({
    path: output,
    width: '1920px',
    height: '1080px',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  console.log(`PDF written: ${output}`);
} finally {
  await browser.close();
}
