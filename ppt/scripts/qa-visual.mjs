#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  isEvidenceVisual,
  isPlainTextOnly,
  maxConsecutive,
  readJson,
  validateManifestObject,
} from './lib/visual-contract.mjs';

function usage(code = 0) {
  const text = `Usage:
  node scripts/qa-visual.mjs <deck.html> [options]

Options:
  --manifest <deck.json>  Visual production manifest. Defaults to deck.json beside the HTML.
  --json <report.json>    Write a machine-readable report.
  --strict                Fail on P1 findings as well as P0 findings.
  --help                  Show this help message.`;
  (code ? console.error : console.log)(text);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) usage(0);
const htmlFile = args[0];
if (!htmlFile || htmlFile.startsWith('--')) usage(2);

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

const htmlPath = path.resolve(htmlFile);
const manifestPath = path.resolve(option('--manifest') || path.join(path.dirname(htmlPath), 'deck.json'));
const reportOption = option('--json');
const strict = args.includes('--strict');

for (const file of [htmlPath, manifestPath]) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(2);
  }
}

let manifest;
try {
  manifest = readJson(manifestPath);
} catch (error) {
  console.error(`Invalid manifest JSON: ${error.message}`);
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');
const manifestValidation = validateManifestObject(manifest, { manifestPath, html, htmlPath, strict: false });
const findings = manifestValidation.findings.map((finding) => ({
  severity: finding.level === 'error' ? 'P0' : 'P1',
  code: finding.code,
  slide: finding.slide || 'deck',
  message: finding.message,
}));

function addFinding(severity, code, slide, message, detail = null) {
  findings.push({ severity, code, slide, message, ...(detail ? { detail } : {}) });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const actualSlides = [];

try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(250);

  const slideCount = await page.locator('.slide').count();
  if (!slideCount) throw new Error('No .slide elements found.');

  for (let index = 0; index < slideCount; index += 1) {
    await page.evaluate((current) => {
      document.querySelectorAll('.slide').forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle('active', active);
        slide.classList.toggle('visible', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
    }, index);
    await page.waitForTimeout(60);

    const result = await page.locator('.slide').nth(index).evaluate((slide) => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width >= 16 && rect.height >= 16;
      };
      const decorative = (element) => element.matches('[aria-hidden="true"],[data-visual-role="decoration"],[data-decorative="true"],.decorative');
      const selector = 'img,svg,canvas,video,[data-visual],[data-visual-type],[data-diagram],[data-chart],[data-image-slot],[role="img"],.diagram,.chart,.visual,.image-shell,.timeline,.compare,.roles,.evidence-grid,.loop,.metric';
      const visualNodes = [
        ...(slide.matches(selector) ? [slide] : []),
        ...slide.querySelectorAll(selector),
      ];
      const candidates = visualNodes.filter((element) => visible(element) && !decorative(element));
      const evidenceCandidates = candidates.filter((element) => {
        const type = element.getAttribute('data-visual-type') || '';
        if (/typographic|intentional-text/i.test(type)) return false;
        if (element.matches('img,svg,canvas,video,[data-diagram],[data-chart],[data-image-slot],.diagram,.chart,.image-shell,.timeline,.compare,.roles,.evidence-grid,.loop,.metric')) return true;
        return /image|illustration|screenshot|chart|diagram|timeline|comparison|visualization/i.test(type);
      });
      const imageData = [...slide.querySelectorAll('img')].filter(visible).map((image) => {
        const rect = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return {
          id: image.dataset.elementId || image.getAttribute('src') || 'img',
          src: image.currentSrc || image.getAttribute('src') || '',
          alt: image.getAttribute('alt') || '',
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          displayWidth: rect.width,
          displayHeight: rect.height,
          slot: image.dataset.imageSlot || image.closest('[data-image-slot]')?.getAttribute('data-image-slot') || '',
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          focus: image.dataset.focus || image.closest('[data-focus]')?.getAttribute('data-focus') || '',
          reusable: image.dataset.reuse === 'allowed' || image.closest('[data-reuse="allowed"]') != null,
          decorative: decorative(image),
        };
      });

      const textElements = [...slide.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,[data-editable="text"]')].filter(visible);
      const overlaps = [];
      if (!slide.hasAttribute('data-allow-overlap')) {
        for (const text of textElements) {
          if (text.closest('[data-allow-overlap]')) continue;
          const a = text.getBoundingClientRect();
          for (const visual of candidates) {
            if (visual.contains(text) || text.contains(visual) || visual.closest('[data-allow-overlap]')) continue;
            const b = visual.getBoundingClientRect();
            const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            const intersection = width * height;
            const minimum = Math.min(a.width * a.height, b.width * b.height);
            if (minimum > 0 && intersection / minimum > 0.18) {
              overlaps.push({
                text: text.dataset.elementId || text.tagName,
                visual: visual.dataset.elementId || visual.getAttribute('data-visual-type') || visual.tagName,
                ratio: intersection / minimum,
              });
            }
          }
        }
      }

      return {
        id: slide.dataset.slideId || `slide-${index + 1}`,
        layout: slide.dataset.layout || 'unassigned',
        visualRequired: slide.dataset.visualRequired === 'true' || Boolean(slide.querySelector('[data-visual-required="true"]')),
        meaningfulVisuals: candidates.length,
        evidenceVisuals: evidenceCandidates.length,
        images: imageData,
        diagrams: candidates.filter((element) => element.matches('svg,[data-diagram],.diagram,.timeline,.compare') || /diagram|timeline|comparison/i.test(element.getAttribute('data-visual-type') || '')).length,
        charts: candidates.filter((element) => element.matches('canvas,[data-chart],.chart') || /chart/i.test(element.getAttribute('data-visual-type') || '')).length,
        decorativeVisuals: visualNodes.filter((element) => visible(element) && decorative(element)).length,
        overlaps,
      };
    });

    actualSlides.push(result);
    const planned = Array.isArray(manifest.slides) ? manifest.slides.find((slide) => slide.id === result.id) : null;
    const plannedType = planned?.visual?.type || 'none';
    const intentionallyTypographic = ['typographic', 'intentional-text'].includes(plannedType);
    if ((planned?.visual?.required || result.visualRequired) && result.meaningfulVisuals === 0 && !intentionallyTypographic) {
      addFinding('P0', 'visual.required-missing', result.id, 'The slide requires a visual but no meaningful visual element was rendered.');
    }
    if (planned && isEvidenceVisual(plannedType) && result.evidenceVisuals === 0) {
      addFinding('P0', 'visual.declared-evidence-missing', result.id, `Manifest declares ${plannedType}, but no evidence visual was rendered.`);
    }
    for (const overlap of result.overlaps) {
      addFinding('P0', 'visual.text-overlap', result.id, `Text ${overlap.text} overlaps visual ${overlap.visual}.`, { ratio: Number(overlap.ratio.toFixed(2)) });
    }
  }
} finally {
  await browser.close();
}

const manifestSlides = Array.isArray(manifest.slides) ? manifest.slides : [];
const manifestById = new Map(manifestSlides.map((slide) => [slide.id, slide]));
const plainTextFlags = actualSlides.map((slide) => {
  const plannedType = manifestById.get(slide.id)?.visual?.type;
  if (['typographic', 'intentional-text'].includes(plannedType)) return false;
  return slide.meaningfulVisuals === 0 || isPlainTextOnly(plannedType);
});
const visualSlides = actualSlides.filter((slide) => {
  const plannedType = manifestById.get(slide.id)?.visual?.type;
  return slide.meaningfulVisuals > 0 || ['typographic', 'intentional-text'].includes(plannedType);
}).length;
const evidenceVisualSlides = actualSlides.filter((slide) => slide.evidenceVisuals > 0).length;
const maxTextRun = maxConsecutive(plainTextFlags, Boolean);
const layouts = actualSlides.map((slide) => slide.layout);
const layoutCounts = new Map();
for (const layout of layouts) layoutCounts.set(layout, (layoutCounts.get(layout) || 0) + 1);
const repeatedLayoutMaximum = Math.max(0, ...layoutCounts.values());
const maxConsecutiveLayout = maxConsecutive(layouts.map((layout, index) => index === 0 || layout === layouts[index - 1]), Boolean);

const allImages = actualSlides.flatMap((slide) => slide.images.map((image) => ({ ...image, slide: slide.id })));
const imageGroups = new Map();
for (const image of allImages) {
  if (!image.src || image.reusable || /^data:image\/svg\+xml/i.test(image.src)) continue;
  const normalized = image.src.replace(/[?#].*$/, '');
  if (!imageGroups.has(normalized)) imageGroups.set(normalized, []);
  imageGroups.get(normalized).push(image);
}
let repeatedImages = 0;
for (const [src, group] of imageGroups) {
  if (group.length > 1) {
    repeatedImages += group.length - 1;
    addFinding('P0', 'image.unapproved-repeat', 'deck', `Image is repeated on ${group.length} slides without data-reuse="allowed": ${src}.`, { slides: group.map((image) => image.slide) });
  }
}

let missingAlt = 0;
let ratioMismatches = 0;
for (const image of allImages) {
  if (!image.alt.trim() && !image.decorative) {
    missingAlt += 1;
    addFinding('P0', 'image.missing-alt', image.slide, `Image ${image.id} is missing alt text.`);
  }
  const slotMatch = image.slot.match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/i);
  if (slotMatch && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const expected = Number(slotMatch[1]) / Number(slotMatch[2]);
    const actual = image.naturalWidth / image.naturalHeight;
    const delta = Math.abs(actual - expected) / expected;
    if (delta > 0.35) {
      ratioMismatches += 1;
      addFinding('P0', 'image.slot-ratio-severe', image.slide, `Image ${image.id} source ratio is incompatible with slot ${image.slot}.`, { actualRatio: Number(actual.toFixed(3)), delta: Number(delta.toFixed(2)) });
    } else if (delta > 0.18) {
      ratioMismatches += 1;
      addFinding('P1', 'image.slot-ratio-review', image.slide, `Image ${image.id} source ratio differs from slot ${image.slot}.`, { actualRatio: Number(actual.toFixed(3)), delta: Number(delta.toFixed(2)) });
    }
  }
  const displayedLarge = image.displayWidth * image.displayHeight > 1920 * 1080 * 0.2;
  const vectorSource = /(?:\.svg(?:[?#]|$)|^data:image\/svg\+xml)/i.test(image.src);
  if (!vectorSource && displayedLarge && (image.naturalWidth < 800 || image.naturalHeight < 450)) {
    addFinding('P0', 'image.thumbnail-upscaled', image.slide, `Image ${image.id} is a small source rendered as a large visual.`, { natural: `${image.naturalWidth}×${image.naturalHeight}`, displayed: `${Math.round(image.displayWidth)}×${Math.round(image.displayHeight)}` });
  }
  const displayRatio = image.displayHeight ? image.displayWidth / image.displayHeight : 0;
  const naturalRatio = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 0;
  const cropDelta = naturalRatio && displayRatio ? Math.abs(naturalRatio - displayRatio) / displayRatio : 0;
  if (image.objectFit === 'cover' && cropDelta > 0.25 && !image.focus && /50% 50%|center/i.test(image.objectPosition)) {
    addFinding('P1', 'image.cover-focus-review', image.slide, `Image ${image.id} is substantially cropped with default center focus. Add data-focus or an intentional object-position.`);
  }
}

const strategy = manifest.visualStrategy || {};
if (manifest.density === 'speaker-led' && Number.isInteger(strategy.maxConsecutiveTextOnly) && maxTextRun > strategy.maxConsecutiveTextOnly) {
  addFinding('P0', 'deck.consecutive-text-only', 'deck', `Speaker-led deck has ${maxTextRun} consecutive plain text-only slides; maximum is ${strategy.maxConsecutiveTextOnly}.`);
}
const visualCoverage = actualSlides.length ? visualSlides / actualSlides.length : 0;
const evidenceCoverage = actualSlides.length ? evidenceVisualSlides / actualSlides.length : 0;
if (Number.isFinite(strategy.targetCoverage) && visualCoverage < strategy.targetCoverage) {
  addFinding('P1', 'deck.visual-coverage-low', 'deck', `Rendered visual coverage ${(visualCoverage * 100).toFixed(0)}% is below target ${(strategy.targetCoverage * 100).toFixed(0)}%.`);
}
if (Number.isFinite(strategy.targetEvidenceCoverage) && evidenceCoverage < strategy.targetEvidenceCoverage) {
  addFinding('P1', 'deck.evidence-coverage-low', 'deck', `Rendered evidence visual coverage ${(evidenceCoverage * 100).toFixed(0)}% is below target ${(strategy.targetEvidenceCoverage * 100).toFixed(0)}%.`);
}
if (actualSlides.length >= 12 && evidenceVisualSlides <= 2) addFinding('P1', 'deck.too-few-evidence-visuals', 'deck', `A ${actualSlides.length}-slide deck contains only ${evidenceVisualSlides} evidence visual slide(s).`);
if (actualSlides.length && repeatedLayoutMaximum / actualSlides.length > 0.5) addFinding('P1', 'deck.layout-dominance', 'deck', `Layout ${[...layoutCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]} is used on more than half the deck.`);
if (maxConsecutiveLayout >= 3) addFinding('P1', 'deck.layout-run', 'deck', `The same layout repeats for ${maxConsecutiveLayout} consecutive slides.`);

const evidencePositions = actualSlides.map((slide, index) => slide.evidenceVisuals > 0 ? index : -1).filter((index) => index >= 0);
if (evidencePositions.length >= 3) {
  const midpoint = actualSlides.length / 2;
  const firstHalf = evidencePositions.filter((index) => index < midpoint).length;
  const secondHalf = evidencePositions.length - firstHalf;
  if (Math.min(firstHalf, secondHalf) === 0) addFinding('P2', 'deck.visual-distribution', 'deck', 'All evidence visuals are concentrated in one half of the deck.');
}
const totalMeaningful = actualSlides.reduce((sum, slide) => sum + slide.meaningfulVisuals, 0);
const totalDecorative = actualSlides.reduce((sum, slide) => sum + slide.decorativeVisuals, 0);
if (totalMeaningful === 0 && totalDecorative > 0) addFinding('P1', 'deck.decorative-only', 'deck', 'All detected visuals are marked decorative; the deck contains no explanatory or evidence visual.');

const summary = {
  slides: actualSlides.length,
  textOnlySlides: plainTextFlags.filter(Boolean).length,
  visualSlides,
  evidenceVisualSlides,
  consecutiveTextOnlyMaximum: maxTextRun,
  uniqueLayouts: layoutCounts.size,
  repeatedLayoutMaximum,
  images: allImages.length,
  diagrams: actualSlides.reduce((sum, slide) => sum + slide.diagrams, 0),
  charts: actualSlides.reduce((sum, slide) => sum + slide.charts, 0),
  missingAltText: missingAlt,
  imageSlotRatioMismatches: ratioMismatches,
  repeatedImages,
  visualCoverage,
  evidenceCoverage,
};

const order = { P0: 0, P1: 1, P2: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || String(a.slide).localeCompare(String(b.slide)) || a.code.localeCompare(b.code));
for (const finding of findings) {
  console.log(`${finding.severity} [${finding.slide}] ${finding.code}: ${finding.message}${finding.detail ? ` — ${JSON.stringify(finding.detail)}` : ''}`);
}

console.log('Visual QA complete');
console.log(`Slides: ${summary.slides}`);
console.log(`Text-only slides: ${summary.textOnlySlides}`);
console.log(`Visual slides: ${summary.visualSlides}`);
console.log(`Evidence visual slides: ${summary.evidenceVisualSlides}`);
console.log(`Consecutive text-only maximum: ${summary.consecutiveTextOnlyMaximum}`);
console.log(`Unique layouts: ${summary.uniqueLayouts}`);
console.log(`Repeated-layout maximum: ${summary.repeatedLayoutMaximum}`);
console.log(`Images: ${summary.images}`);
console.log(`Diagrams: ${summary.diagrams}`);
console.log(`Charts: ${summary.charts}`);
console.log(`Missing alt text: ${summary.missingAltText}`);
console.log(`Image-slot ratio mismatches: ${summary.imageSlotRatioMismatches}`);
console.log(`Repeated images: ${summary.repeatedImages}`);
console.log(`Findings: ${findings.filter((finding) => finding.severity === 'P0').length} P0, ${findings.filter((finding) => finding.severity === 'P1').length} P1, ${findings.filter((finding) => finding.severity === 'P2').length} P2.`);

const report = { html: htmlPath, manifest: manifestPath, strict, summary, slides: actualSlides, findings };
if (reportOption) {
  const reportPath = path.resolve(reportOption);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report: ${reportPath}`);
}

const p0 = findings.some((finding) => finding.severity === 'P0');
const p1 = findings.some((finding) => finding.severity === 'P1');
if (p0 || (strict && p1)) process.exitCode = 1;
