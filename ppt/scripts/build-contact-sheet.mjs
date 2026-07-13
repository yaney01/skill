#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

function usage(code = 0) {
  const text = `Usage:
  node scripts/build-contact-sheet.mjs <deck.html> <output.png> [options]

Options:
  --columns <n>      Number of columns. Defaults to 4.
  --cell-width <px>  Thumbnail width. Defaults to 360.
  --html <file>      Also save the generated contact-sheet HTML.
  --help             Show this help message.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const input = args[0];
const output = args[1];
if (!input || !output || input.startsWith('--') || output.startsWith('--')) usage(2);

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${name} requires a value.`);
    process.exit(2);
  }
  return value;
}

const inputPath = path.resolve(input);
const outputPath = path.resolve(output);
const columns = Number.parseInt(option('--columns') || '4', 10);
const cellWidth = Number.parseInt(option('--cell-width') || '360', 10);
const htmlOutput = option('--html');
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(2);
}
if (!(columns >= 1 && columns <= 8) || !(cellWidth >= 180 && cellWidth <= 900)) {
  console.error('columns must be 1–8 and cell-width must be 180–900.');
  process.exit(2);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const deckPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await deckPage.goto(pathToFileURL(inputPath).href, { waitUntil: 'networkidle' });
  await deckPage.emulateMedia({ reducedMotion: 'reduce' });
  await deckPage.waitForTimeout(250);
  const count = await deckPage.locator('.slide').count();
  if (!count) throw new Error('No .slide elements found.');

  const slides = [];
  for (let index = 0; index < count; index += 1) {
    await deckPage.evaluate((current) => {
      document.querySelectorAll('.slide').forEach((slide, slideIndex) => {
        slide.classList.toggle('active', slideIndex === current);
        slide.classList.toggle('visible', slideIndex === current);
      });
    }, index);
    await deckPage.waitForTimeout(50);
    const locator = deckPage.locator('.slide').nth(index);
    const id = await locator.getAttribute('data-slide-id') || `slide-${index + 1}`;
    const layout = await locator.getAttribute('data-layout') || 'unassigned';
    const buffer = await locator.screenshot({ type: 'png' });
    slides.push({ index: index + 1, id, layout, data: buffer.toString('base64') });
  }

  const gap = 24;
  const pagePadding = 38;
  const labelHeight = 42;
  const cellHeight = Math.round(cellWidth * 9 / 16) + labelHeight;
  const sheetWidth = pagePadding * 2 + columns * cellWidth + (columns - 1) * gap;
  const title = path.basename(inputPath, path.extname(inputPath));
  const cards = slides.map((slide) => `
    <figure class="card">
      <img src="data:image/png;base64,${slide.data}" alt="${slide.id}">
      <figcaption><strong>${String(slide.index).padStart(2, '0')}</strong><span>${slide.id}</span><em>${slide.layout}</em></figcaption>
    </figure>`).join('');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#111318;color:#f5f5f2;font-family:Arial,sans-serif}body{padding:${pagePadding}px}.header{display:flex;justify-content:space-between;align-items:end;margin-bottom:28px}.header h1{font-size:28px;margin:0}.header p{font-size:16px;margin:0;color:#aeb4bd}.grid{display:grid;grid-template-columns:repeat(${columns},${cellWidth}px);gap:${gap}px}.card{width:${cellWidth}px;margin:0;background:#20242c;border:1px solid #363c47;box-shadow:0 12px 28px rgba(0,0,0,.25)}.card img{display:block;width:${cellWidth}px;height:${Math.round(cellWidth * 9 / 16)}px;object-fit:cover;background:#000}.card figcaption{height:${labelHeight}px;padding:0 12px;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;font-size:12px}.card strong{font-size:14px}.card span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card em{font-style:normal;color:#aeb4bd}
</style></head><body><div class="header"><h1>${title}</h1><p>${slides.length} slides · ${columns} columns</p></div><main class="grid">${cards}</main></body></html>`;

  if (htmlOutput) {
    const htmlPath = path.resolve(htmlOutput);
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  const sheetPage = await browser.newPage({ viewport: { width: sheetWidth, height: Math.max(900, cellHeight * Math.ceil(slides.length / columns) + 180) }, deviceScaleFactor: 1 });
  await sheetPage.setContent(html, { waitUntil: 'load' });
  await sheetPage.screenshot({ path: outputPath, fullPage: true });
  console.log(`Contact sheet complete: ${slides.length} slide(s).`);
  console.log(`Output: ${outputPath}`);
} finally {
  await browser.close();
}
