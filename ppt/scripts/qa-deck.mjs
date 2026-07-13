#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const file = args[0];
const screenshotFlag = args.indexOf('--screenshots');
const screenshotDir = screenshotFlag >= 0 ? args[screenshotFlag + 1] : null;

if (!file) {
  console.error('Usage: node scripts/qa-deck.mjs deck.html [--screenshots output-dir]');
  process.exit(2);
}

const absolute = path.resolve(file);
if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(2);
}
if (screenshotDir) fs.mkdirSync(path.resolve(screenshotDir), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const findings = [];

try {
  await page.goto(pathToFileURL(absolute).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(250);

  const slideCount = await page.locator('.slide').count();
  if (!slideCount) throw new Error('No .slide elements found.');

  for (let index = 0; index < slideCount; index += 1) {
    await page.evaluate((current) => {
      document.querySelectorAll('.slide').forEach((slide, i) => {
        slide.classList.toggle('active', i === current);
        slide.classList.toggle('visible', i === current);
      });
    }, index);
    await page.waitForTimeout(80);

    const result = await page.locator('.slide').nth(index).evaluate((slide) => {
      const slideRect = slide.getBoundingClientRect();
      const textSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,[data-editable="text"]';
      const outOfBounds = [];
      const smallText = [];

      for (const element of slide.querySelectorAll(textSelector)) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
        if (!visible || rect.width === 0 || rect.height === 0) continue;

        const epsilon = 1;
        if (
          rect.left < slideRect.left - epsilon ||
          rect.top < slideRect.top - epsilon ||
          rect.right > slideRect.right + epsilon ||
          rect.bottom > slideRect.bottom + epsilon
        ) {
          outOfBounds.push({
            id: element.dataset.elementId || element.tagName,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          });
        }

        const size = Number.parseFloat(style.fontSize);
        const text = (element.textContent || '').trim();
        if (text && size < 20) smallText.push({ id: element.dataset.elementId || element.tagName, size, text: text.slice(0, 50) });
      }

      const brokenImages = [...slide.querySelectorAll('img')]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.dataset.elementId || image.getAttribute('src') || 'img');

      return {
        slideId: slide.dataset.slideId || `slide-${index + 1}`,
        scrollOverflow: slide.scrollWidth > 1920 || slide.scrollHeight > 1080,
        outOfBounds,
        smallText,
        brokenImages
      };
    });

    if (result.scrollOverflow) findings.push({ level: 'error', slide: result.slideId, message: 'Slide scroll dimensions exceed 1920×1080.' });
    for (const item of result.outOfBounds) findings.push({ level: 'error', slide: result.slideId, message: `Text out of bounds: ${item.id}`, detail: item.rect });
    for (const item of result.brokenImages) findings.push({ level: 'error', slide: result.slideId, message: `Broken image: ${item}` });
    for (const item of result.smallText) findings.push({ level: 'warning', slide: result.slideId, message: `Text below 20px: ${item.id} (${item.size}px)`, detail: item.text });

    if (screenshotDir) {
      const output = path.join(path.resolve(screenshotDir), `${String(index + 1).padStart(2, '0')}-${result.slideId}.png`);
      await page.locator('.slide').nth(index).screenshot({ path: output });
    }
  }

  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[data-element-id]')].map((element) => element.dataset.elementId);
    return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  });
  if (duplicateIds.length) findings.push({ level: 'error', slide: 'deck', message: `Duplicate data-element-id values: ${duplicateIds.join(', ')}` });

  for (const finding of findings) {
    const prefix = finding.level === 'error' ? 'ERROR' : 'WARN';
    console.log(`${prefix} [${finding.slide}] ${finding.message}${finding.detail ? ` — ${JSON.stringify(finding.detail)}` : ''}`);
  }

  const errorCount = findings.filter((finding) => finding.level === 'error').length;
  console.log(`QA complete: ${slideCount} slide(s), ${errorCount} error(s), ${findings.length - errorCount} warning(s).`);
  if (screenshotDir) console.log(`Screenshots: ${path.resolve(screenshotDir)}`);
  if (errorCount) process.exitCode = 1;
} finally {
  await browser.close();
}
