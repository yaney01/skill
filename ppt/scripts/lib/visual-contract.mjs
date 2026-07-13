import fs from 'node:fs';
import path from 'node:path';

export const VISUAL_TYPES = new Set([
  'image',
  'editorial-illustration',
  'product-screenshot',
  'data-chart',
  'workflow-diagram',
  'system-diagram',
  'comparison-diagram',
  'timeline',
  'html-visualization',
  'typographic',
  'intentional-text',
  'none',
]);

export const VISUAL_STATUSES = new Set(['planned', 'ready', 'missing', 'not-needed']);
export const VISUAL_SOURCES = new Set(['supplied', 'generated', 'screenshot', 'css', 'svg', 'html', 'chart', 'none']);
export const FILE_VISUAL_SOURCES = new Set(['supplied', 'generated', 'screenshot']);
export const EVIDENCE_VISUAL_TYPES = new Set([
  'image', 'editorial-illustration', 'product-screenshot', 'data-chart',
  'workflow-diagram', 'system-diagram', 'comparison-diagram', 'timeline', 'html-visualization',
]);
export const VISUAL_LAYOUT_HINTS = /(?:image|visual|diagram|chart|process|workflow|system|timeline|comparison|evidence|screenshot|gallery|media)/i;

export function isMeaningfulVisual(type) {
  return Boolean(type && type !== 'none');
}

export function isEvidenceVisual(type) {
  return EVIDENCE_VISUAL_TYPES.has(type);
}

export function isPlainTextOnly(type) {
  return !type || type === 'none';
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function parseAttributes(source = '') {
  const attributes = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of source.matchAll(pattern)) attributes[match[1]] = match[2] ?? match[3] ?? '';
  return attributes;
}

export function stripHtml(source = '') {
  return source
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractHtmlSlides(html) {
  const starts = [...html.matchAll(/<section\b([^>]*\bclass\s*=\s*["'][^"']*\bslide\b[^"']*["'][^>]*)>/gi)];
  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const end = index + 1 < starts.length ? (starts[index + 1].index ?? html.length) : html.length;
    const body = html.slice(contentStart, end);
    const attrs = parseAttributes(match[1]);
    const headlineMatch = body.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const visualScope = `${match[1]} ${body}`;
    return {
      id: attrs['data-slide-id'] || `slide-${String(index + 1).padStart(2, '0')}`,
      layout: attrs['data-layout'] || 'unassigned',
      attrs,
      body,
      headline: stripHtml(headlineMatch?.[1] || ''),
      hasVisualMarkup: /<(?:img|svg|canvas|video)\b|data-(?:visual|visual-type|diagram|chart|image-slot)\s*=|class\s*=\s*["'][^"']*(?:diagram|chart|visual|image-shell|timeline|compare|metric|gallery|media|evidence|roles|loop)[^"']*["']/i.test(visualScope),
    };
  });
}

export function parseRatio(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0 && height > 0)) return null;
  return width / height;
}

function pushFinding(findings, level, code, message, context = {}) {
  findings.push({ level, code, message, ...context });
}

export function maxConsecutive(values, predicate) {
  let maximum = 0;
  let current = 0;
  for (const value of values) {
    if (predicate(value)) {
      current += 1;
      maximum = Math.max(maximum, current);
    } else current = 0;
  }
  return maximum;
}

export function summarizeManifest(manifest) {
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : [];
  const visualSlides = slides.filter((slide) => isMeaningfulVisual(slide?.visual?.type)).length;
  const evidenceSlides = slides.filter((slide) => isEvidenceVisual(slide?.visual?.type)).length;
  const textOnlySlides = slides.filter((slide) => isPlainTextOnly(slide?.visual?.type)).length;
  return {
    slides: slides.length,
    visualSlides,
    evidenceSlides,
    textOnlySlides,
    visualCoverage: slides.length ? visualSlides / slides.length : 0,
    evidenceCoverage: slides.length ? evidenceSlides / slides.length : 0,
    maxConsecutiveTextOnly: maxConsecutive(slides, (slide) => isPlainTextOnly(slide?.visual?.type)),
  };
}

export function validateManifestObject(manifest, options = {}) {
  const findings = [];
  const manifestPath = options.manifestPath ? path.resolve(options.manifestPath) : null;
  const manifestDir = manifestPath ? path.dirname(manifestPath) : process.cwd();
  const html = options.html || null;
  const strict = Boolean(options.strict);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    pushFinding(findings, 'error', 'manifest.invalid-root', 'Manifest root must be a JSON object.');
    return { findings, summary: summarizeManifest({ slides: [] }) };
  }

  for (const key of ['id', 'title', 'language', 'density']) {
    if (typeof manifest[key] !== 'string' || !manifest[key].trim()) pushFinding(findings, 'error', `manifest.missing-${key}`, `Top-level ${key} must be a non-empty string.`);
  }
  if (manifest.density && !['speaker-led', 'reading-first'].includes(manifest.density)) {
    pushFinding(findings, 'error', 'manifest.invalid-density', 'density must be speaker-led or reading-first.');
  }

  const strategy = manifest.visualStrategy;
  if (!strategy || typeof strategy !== 'object' || Array.isArray(strategy)) {
    pushFinding(findings, strict ? 'error' : 'warning', 'manifest.missing-visual-strategy', 'visualStrategy is missing; visual QA thresholds cannot be enforced.');
  } else {
    for (const key of ['targetCoverage', 'targetEvidenceCoverage']) {
      if (strategy[key] != null && (!(Number.isFinite(strategy[key])) || strategy[key] < 0 || strategy[key] > 1)) {
        pushFinding(findings, 'error', `manifest.invalid-${key}`, `${key} must be a number between 0 and 1.`);
      }
    }
    if (strategy.maxConsecutiveTextOnly != null && (!Number.isInteger(strategy.maxConsecutiveTextOnly) || strategy.maxConsecutiveTextOnly < 0)) {
      pushFinding(findings, 'error', 'manifest.invalid-max-consecutive-text-only', 'maxConsecutiveTextOnly must be a non-negative integer.');
    }
  }

  if (!Array.isArray(manifest.slides)) {
    if (Number.isInteger(manifest.slides)) {
      pushFinding(findings, strict ? 'error' : 'warning', 'manifest.legacy-slide-count', 'slides is a legacy integer. Replace it with the per-slide production manifest array.');
    } else {
      pushFinding(findings, 'error', 'manifest.invalid-slides', 'slides must be an array of per-slide production records.');
    }
    return { findings, summary: summarizeManifest({ slides: [] }) };
  }

  const ids = new Set();
  for (const [index, slide] of manifest.slides.entries()) {
    const location = { slide: slide?.id || `index-${index}` };
    if (!slide || typeof slide !== 'object' || Array.isArray(slide)) {
      pushFinding(findings, 'error', 'slide.invalid-record', `slides[${index}] must be an object.`, location);
      continue;
    }
    if (typeof slide.id !== 'string' || !slide.id.trim()) pushFinding(findings, 'error', 'slide.missing-id', `slides[${index}] is missing id.`, location);
    else if (ids.has(slide.id)) pushFinding(findings, 'error', 'slide.duplicate-id', `Duplicate slide id: ${slide.id}.`, location);
    else ids.add(slide.id);
    for (const key of ['purpose', 'layout', 'headline']) {
      if (typeof slide[key] !== 'string' || !slide[key].trim()) pushFinding(findings, 'warning', `slide.missing-${key}`, `${slide.id || `slides[${index}]`} is missing ${key}.`, location);
    }

    const visual = slide.visual;
    if (!visual || typeof visual !== 'object' || Array.isArray(visual)) {
      pushFinding(findings, 'error', 'slide.missing-visual', `${slide.id || `slides[${index}]`} is missing its visual decision.`, location);
      continue;
    }
    if (!VISUAL_TYPES.has(visual.type)) pushFinding(findings, 'error', 'visual.invalid-type', `Unknown visual type: ${visual.type ?? 'undefined'}.`, location);
    if (typeof visual.required !== 'boolean') pushFinding(findings, 'error', 'visual.invalid-required', 'visual.required must be boolean.', location);
    if (!VISUAL_STATUSES.has(visual.status)) pushFinding(findings, 'error', 'visual.invalid-status', `Unknown visual status: ${visual.status ?? 'undefined'}.`, location);
    if (!VISUAL_SOURCES.has(visual.source)) pushFinding(findings, 'error', 'visual.invalid-source', `Unknown visual source: ${visual.source ?? 'undefined'}.`, location);
    if (visual.slot != null && !parseRatio(visual.slot)) pushFinding(findings, 'error', 'visual.invalid-slot', `Invalid visual slot ratio: ${visual.slot}.`, location);

    if (visual.required && visual.status !== 'ready') pushFinding(findings, 'error', 'visual.required-not-ready', `${slide.id} requires a visual but status is ${visual.status}.`, location);
    if (visual.status === 'ready' && FILE_VISUAL_SOURCES.has(visual.source)) {
      if (typeof visual.path !== 'string' || !visual.path.trim()) pushFinding(findings, 'error', 'visual.missing-path', `${slide.id} uses ${visual.source} visual source but has no path.`, location);
      else if (!/^(?:data:|https?:|\/\/)/i.test(visual.path)) {
        const absolute = path.resolve(manifestDir, visual.path);
        if (!fs.existsSync(absolute)) pushFinding(findings, 'error', 'visual.file-not-found', `Visual file not found: ${visual.path}.`, { ...location, path: visual.path });
      }
    }
    if (visual.type === 'none' && visual.required) pushFinding(findings, 'error', 'visual.none-required', `${slide.id} cannot require visual type none.`, location);
    if (visual.type === 'none' && visual.status === 'ready') pushFinding(findings, 'warning', 'visual.none-ready', `${slide.id} declares type none with status ready.`, location);
    if (isEvidenceVisual(visual.type) && (!visual.role || visual.role === 'decoration')) {
      pushFinding(findings, 'warning', 'visual.missing-narrative-role', `${slide.id} evidence visual should declare a narrative role other than decoration.`, location);
    }
  }

  const summary = summarizeManifest(manifest);
  if (strategy && manifest.slides.length) {
    if (Number.isFinite(strategy.targetCoverage) && summary.visualCoverage + 1e-9 < strategy.targetCoverage) {
      pushFinding(findings, 'warning', 'deck.visual-coverage-low', `Visual coverage ${(summary.visualCoverage * 100).toFixed(0)}% is below target ${(strategy.targetCoverage * 100).toFixed(0)}%.`);
    }
    if (Number.isFinite(strategy.targetEvidenceCoverage) && summary.evidenceCoverage + 1e-9 < strategy.targetEvidenceCoverage) {
      pushFinding(findings, 'warning', 'deck.evidence-coverage-low', `Evidence visual coverage ${(summary.evidenceCoverage * 100).toFixed(0)}% is below target ${(strategy.targetEvidenceCoverage * 100).toFixed(0)}%.`);
    }
    if (Number.isInteger(strategy.maxConsecutiveTextOnly) && summary.maxConsecutiveTextOnly > strategy.maxConsecutiveTextOnly) {
      pushFinding(findings, manifest.density === 'speaker-led' ? 'error' : 'warning', 'deck.text-only-run-too-long', `Maximum consecutive plain text-only slides is ${summary.maxConsecutiveTextOnly}; target is ${strategy.maxConsecutiveTextOnly}.`);
    }
  }

  if (html) {
    const htmlSlides = extractHtmlSlides(html);
    const htmlById = new Map(htmlSlides.map((slide) => [slide.id, slide]));
    if (htmlSlides.length !== manifest.slides.length) pushFinding(findings, 'error', 'deck.slide-count-mismatch', `Manifest contains ${manifest.slides.length} slides but HTML contains ${htmlSlides.length}.`);
    for (const slide of manifest.slides) {
      const actual = htmlById.get(slide.id);
      if (!actual) {
        pushFinding(findings, 'error', 'slide.missing-in-html', `Manifest slide ${slide.id} was not found in HTML.`, { slide: slide.id });
        continue;
      }
      if (slide.layout && actual.layout !== slide.layout) pushFinding(findings, 'warning', 'slide.layout-mismatch', `${slide.id} manifest layout ${slide.layout} differs from HTML layout ${actual.layout}.`, { slide: slide.id });
      const requiredByMarkup = /data-visual-required\s*=\s*["']true["']/i.test(actual.attrs ? JSON.stringify(actual.attrs) : '') || /data-visual-required\s*=\s*["']true["']/i.test(actual.body);
      if ((slide.visual?.required || requiredByMarkup || VISUAL_LAYOUT_HINTS.test(actual.layout)) && !actual.hasVisualMarkup && !['typographic', 'intentional-text'].includes(slide.visual?.type)) {
        pushFinding(findings, 'error', 'visual.required-missing-in-html', `${slide.id} requires visual content but no image, SVG, canvas, chart, diagram, or visual container was found.`, { slide: slide.id });
      }
    }
  }

  return { findings, summary };
}
