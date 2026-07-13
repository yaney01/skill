import fs from 'node:fs';
import path from 'node:path';

export const VISUAL_PLAN_VERSION = 1;
export const VISUAL_STAGES = new Set(['planning', 'delivery']);
export const VISUAL_STATUSES = new Set(['planned', 'ready', 'missing', 'not-needed']);
export const FILE_SOURCES = new Set(['supplied', 'generated', 'screenshot']);
export const DEFAULT_EXCLUSIONS = [
  'text',
  'letters',
  'numbers',
  'logos',
  'watermarks',
  'signatures',
  'presentation chrome',
  'slide borders',
  'captions',
  'page numbers',
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pushFinding(findings, level, code, message, context = {}) {
  findings.push({ level, code, message, ...context });
}

function normalizePath(value = '') {
  return String(value).replaceAll('\\', '/');
}

function isRemotePath(value = '') {
  return /^(?:data:|https?:|\/\/)/i.test(value);
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function escapeMarkdown(value = '') {
  return String(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function safeAssetId(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'visual';
}

export function parseRatio(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? width / height : null;
}

export function deliveryType(visual = {}) {
  if (visual.type === 'none') return 'none';
  if (visual.type === 'typographic' || visual.type === 'intentional-text') return 'typography';
  if (FILE_SOURCES.has(visual.source)) return 'file';
  return 'dom';
}

function defaultBrief(deck, slide, visual) {
  const role = visual.role || 'explanation';
  const headline = slide.headline || slide.id;
  const purpose = slide.purpose || 'content';
  return `${role} visual for slide “${headline}”. It must support the ${purpose} purpose and remain legible inside the ${slide.layout || 'assigned'} layout.`;
}

function defaultPrompt(deck, slide, visual) {
  const slot = visual.slot || 'declared slide slot';
  const focus = visual.focus || 'center';
  const palette = deck.themeName || deck.style || 'the presentation theme';
  return [
    `${visual.type || 'editorial visual'} for a presentation slide.`,
    `Slide claim: ${slide.headline || slide.id}.`,
    `Purpose: ${slide.purpose || 'content'}. Narrative role: ${visual.role || 'context'}.`,
    `Composition: match ${slot}; focal point at ${focus}; preserve layout-safe negative space.`,
    `Palette and material language: match ${palette}.`,
    `No ${DEFAULT_EXCLUSIONS.join(', ')}.`,
  ].join('\n');
}

function defaultInstructions(slide, visual, delivery) {
  if (visual.source === 'screenshot') {
    return `Capture the real product or interface state that proves “${slide.headline || slide.id}”. Preserve readable UI text; do not recreate critical UI labels with a generative image model.`;
  }
  if (visual.source === 'supplied') {
    return 'Review the supplied asset for rights, source resolution, slot ratio, focal position, and narrative relevance before marking it ready.';
  }
  if (delivery === 'dom') {
    return `Build this ${visual.type || 'visual'} as semantic HTML, SVG, CSS, or chart markup. Keep exact labels in DOM text rather than rasterizing them.`;
  }
  if (delivery === 'typography') {
    return 'Treat typography, scale, spacing, and composition as the primary visual device. Do not add a decorative image merely to increase image count.';
  }
  return 'No production asset is required. Keep the reason explicit in the slide visual notes.';
}

export function buildVisualWorkOrders(deck, options = {}) {
  if (!deck || typeof deck !== 'object' || Array.isArray(deck)) throw new Error('Deck manifest must be a JSON object.');
  if (!Array.isArray(deck.slides)) throw new Error('Deck manifest slides must be an array.');
  const items = deck.slides.map((slide, index) => {
    const visual = slide.visual || {};
    const delivery = deliveryType(visual);
    const assetId = visual.assetId || `${safeAssetId(slide.id)}-visual`;
    const prompt = visual.source === 'generated' ? (visual.prompt || defaultPrompt(deck, slide, visual)) : (visual.prompt || '');
    const exclusions = asArray(visual.exclusions).length ? [...visual.exclusions] : (visual.source === 'generated' ? [...DEFAULT_EXCLUSIONS] : []);
    return {
      id: assetId,
      slideId: slide.id,
      order: index + 1,
      headline: slide.headline || '',
      purpose: slide.purpose || '',
      layout: slide.layout || '',
      type: visual.type || 'none',
      role: visual.role || 'decoration',
      source: visual.source || 'none',
      required: Boolean(visual.required),
      status: visual.status || (visual.required ? 'planned' : 'not-needed'),
      delivery,
      ...(visual.slot ? { slot: visual.slot } : {}),
      ...(visual.path ? { path: normalizePath(visual.path) } : {}),
      ...(visual.alt != null ? { alt: visual.alt } : {}),
      ...(visual.focus ? { focus: visual.focus } : {}),
      brief: visual.brief || defaultBrief(deck, slide, visual),
      ...(prompt ? { prompt } : {}),
      ...(exclusions.length ? { exclusions } : {}),
      instructions: visual.instructions || defaultInstructions(slide, visual, delivery),
      ...(visual.notes ? { notes: visual.notes } : {}),
      ...(visual.credit ? { credit: visual.credit } : {}),
      ...(visual.license ? { license: visual.license } : {}),
    };
  });
  const summary = summarizeWorkOrders(items);
  return {
    $schema: options.schema || 'https://github.com/yaney01/skill/blob/main/ppt/schemas/visual-work-orders.schema.json',
    planVersion: VISUAL_PLAN_VERSION,
    stage: options.stage || 'planning',
    deck: {
      id: deck.id || '',
      title: deck.title || '',
      language: deck.language || '',
      density: deck.density || '',
      style: deck.style || '',
      themeName: deck.themeName ?? null,
      manifest: options.manifest || 'deck.json',
    },
    generatedAt: options.generatedAt || new Date().toISOString(),
    summary,
    items,
  };
}

export function summarizeWorkOrders(items = []) {
  const count = (predicate) => items.filter(predicate).length;
  return {
    total: items.length,
    required: count((item) => item.required),
    ready: count((item) => item.status === 'ready'),
    planned: count((item) => item.status === 'planned'),
    missing: count((item) => item.status === 'missing'),
    notNeeded: count((item) => item.status === 'not-needed'),
    fileDeliveries: count((item) => item.delivery === 'file'),
    domDeliveries: count((item) => item.delivery === 'dom'),
    typographyDeliveries: count((item) => item.delivery === 'typography'),
    deliveryReady: items.every((item) => !item.required || item.status === 'ready'),
  };
}

export function renderVisualWorkOrdersMarkdown(plan) {
  const lines = [
    `# Visual work orders — ${plan.deck?.title || plan.deck?.id || 'deck'}`,
    '',
    `- Deck: \`${plan.deck?.id || ''}\``,
    `- Stage: \`${plan.stage || 'planning'}\``,
    `- Generated: ${plan.generatedAt || ''}`,
    `- Required: ${plan.summary?.required ?? 0}`,
    `- Ready: ${plan.summary?.ready ?? 0}`,
    `- Planned: ${plan.summary?.planned ?? 0}`,
    `- Missing: ${plan.summary?.missing ?? 0}`,
    '',
    '## Sequence',
    '',
    '| # | Slide | Status | Delivery | Type | Role | Slot | Path |',
    '|---:|---|---|---|---|---|---|---|',
  ];
  for (const item of plan.items || []) {
    lines.push(`| ${item.order} | ${escapeMarkdown(item.slideId)} — ${escapeMarkdown(item.headline)} | ${item.status} | ${item.delivery} | ${item.type} | ${item.role} | ${escapeMarkdown(item.slot || '—')} | ${escapeMarkdown(item.path || '—')} |`);
  }
  for (const item of plan.items || []) {
    lines.push('', `## ${String(item.order).padStart(2, '0')} · ${item.slideId}`, '', `**Headline:** ${item.headline || '—'}`, '', `**Brief:** ${item.brief || '—'}`, '', `**Instructions:** ${item.instructions || '—'}`);
    if (item.prompt) lines.push('', '**Prompt:**', '', '```text', item.prompt, '```');
    if (item.exclusions?.length) lines.push('', `**Exclusions:** ${item.exclusions.join(', ')}`);
    if (item.alt != null) lines.push('', `**Alt:** ${item.alt || '—'}`);
    if (item.focus) lines.push('', `**Focus:** ${item.focus}`);
    if (item.notes) lines.push('', `**Notes:** ${item.notes}`);
  }
  return `${lines.join('\n')}\n`;
}

export function writeVisualWorkOrders(plan, options = {}) {
  const jsonPath = path.resolve(options.jsonPath);
  const markdownPath = path.resolve(options.markdownPath);
  for (const target of [jsonPath, markdownPath]) {
    if (fs.existsSync(target) && !options.force) throw new Error(`Refusing to overwrite existing visual work-order output: ${target}. Use --force.`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  const manifestPath = options.manifestPath ? path.resolve(options.manifestPath) : null;
  const outputPlan = structuredClone(plan);
  if (manifestPath) outputPlan.deck.manifest = normalizePath(path.relative(path.dirname(jsonPath), manifestPath) || path.basename(manifestPath));
  outputPlan.summary = summarizeWorkOrders(outputPlan.items || []);
  fs.writeFileSync(jsonPath, `${JSON.stringify(outputPlan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, renderVisualWorkOrdersMarkdown(outputPlan), 'utf8');
  return { plan: outputPlan, jsonPath, markdownPath };
}

function readSvgDimensions(file) {
  const source = fs.readFileSync(file, 'utf8').slice(0, 10000);
  const width = Number(source.match(/\bwidth\s*=\s*["']([0-9.]+)/i)?.[1]);
  const height = Number(source.match(/\bheight\s*=\s*["']([0-9.]+)/i)?.[1]);
  if (width > 0 && height > 0) return { width, height, format: 'svg' };
  const viewBox = source.match(/\bviewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]), format: 'svg' };
  return null;
}

function readJpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpeg' };
    }
    if (!(length >= 2)) break;
    offset += length + 2;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height, format: 'webp' };
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + b0 + ((b1 & 0x3f) << 8),
      height: 1 + ((b1 & 0xc0) >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10),
      format: 'webp',
    };
  }
  const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  if (signature >= 0 && signature + 7 < buffer.length) {
    return {
      width: buffer.readUInt16LE(signature + 3) & 0x3fff,
      height: buffer.readUInt16LE(signature + 5) & 0x3fff,
      format: 'webp',
    };
  }
  return null;
}

export function readImageDimensions(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.svg') return readSvgDimensions(file);
  const buffer = fs.readFileSync(file);
  if (buffer.length >= 24 && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
  }
  if (buffer.length >= 10 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), format: 'gif' };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) return readJpegDimensions(buffer);
  return readWebpDimensions(buffer);
}

export function validateVisualWorkOrders(plan, options = {}) {
  const findings = [];
  const stage = options.stage || plan?.stage || 'planning';
  const strict = Boolean(options.strict);
  const ratioTolerance = Number.isFinite(options.ratioTolerance) ? options.ratioTolerance : 0.05;
  if (!VISUAL_STAGES.has(stage)) pushFinding(findings, 'error', 'plan.invalid-stage', `Unknown stage: ${stage}.`);
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    pushFinding(findings, 'error', 'plan.invalid-root', 'Visual work-order root must be an object.');
    return { findings, summary: summarizeWorkOrders([]), stage };
  }
  if (plan.planVersion !== VISUAL_PLAN_VERSION) pushFinding(findings, 'error', 'plan.invalid-version', `planVersion must be ${VISUAL_PLAN_VERSION}.`);
  if (!plan.deck || typeof plan.deck !== 'object' || !String(plan.deck.id || '').trim()) pushFinding(findings, 'error', 'plan.missing-deck', 'Visual work orders must identify the deck.');
  if (!Array.isArray(plan.items)) {
    pushFinding(findings, 'error', 'plan.invalid-items', 'items must be an array.');
    return { findings, summary: summarizeWorkOrders([]), stage };
  }

  const deck = options.deck || null;
  const deckSlides = new Map((deck?.slides || []).map((slide) => [slide.id, slide]));
  const projectRoot = options.deckPath ? path.dirname(path.resolve(options.deckPath)) : options.projectRoot ? path.resolve(options.projectRoot) : process.cwd();
  const itemIds = new Set();
  const slideIds = new Set();

  for (const [index, item] of plan.items.entries()) {
    const context = { item: item?.id || `index-${index}`, slide: item?.slideId || undefined };
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      pushFinding(findings, 'error', 'item.invalid-record', `items[${index}] must be an object.`, context);
      continue;
    }
    if (!String(item.id || '').trim()) pushFinding(findings, 'error', 'item.missing-id', `items[${index}] is missing id.`, context);
    else if (itemIds.has(item.id)) pushFinding(findings, 'error', 'item.duplicate-id', `Duplicate work-order id: ${item.id}.`, context);
    else itemIds.add(item.id);
    if (!String(item.slideId || '').trim()) pushFinding(findings, 'error', 'item.missing-slide-id', `${item.id || `items[${index}]`} is missing slideId.`, context);
    else if (slideIds.has(item.slideId)) pushFinding(findings, 'error', 'item.duplicate-slide-id', `Multiple work orders target ${item.slideId}.`, context);
    else slideIds.add(item.slideId);
    if (!VISUAL_STATUSES.has(item.status)) pushFinding(findings, 'error', 'item.invalid-status', `Unknown status: ${item.status}.`, context);
    if (!['file', 'dom', 'typography', 'none'].includes(item.delivery)) pushFinding(findings, 'error', 'item.invalid-delivery', `Unknown delivery type: ${item.delivery}.`, context);
    if (item.slot != null && !parseRatio(item.slot)) pushFinding(findings, 'error', 'item.invalid-slot', `Invalid slot ratio: ${item.slot}.`, context);
    if (item.required && item.status === 'not-needed') pushFinding(findings, 'error', 'item.required-not-needed', 'A required visual cannot be marked not-needed.', context);
    if (item.required && item.status !== 'ready') {
      const level = stage === 'delivery' ? 'error' : item.status === 'missing' ? 'warning' : 'warning';
      pushFinding(findings, level, 'item.required-not-ready', `Required visual is ${item.status}.`, context);
    }
    if (!String(item.brief || '').trim() && item.delivery !== 'none') pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.missing-brief', 'Visual work order has no production brief.', context);
    if (item.source === 'generated' && !String(item.prompt || '').trim()) pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.missing-prompt', 'Generated visual has no prompt.', context);

    if (item.delivery === 'file') {
      if (!parseRatio(item.slot)) pushFinding(findings, stage === 'delivery' && item.required ? 'error' : 'warning', 'item.missing-slot', 'File visual must declare a target slot ratio.', context);
      if (item.role !== 'decoration' && !String(item.alt || '').trim()) pushFinding(findings, stage === 'delivery' && item.required ? 'error' : 'warning', 'item.missing-alt', 'Meaningful file visual must include alternative text.', context);
      if (item.status === 'ready' || stage === 'delivery') {
        if (!String(item.path || '').trim()) {
          pushFinding(findings, item.required || stage === 'delivery' ? 'error' : 'warning', 'item.missing-path', 'File visual has no path.', context);
        } else if (isRemotePath(item.path)) {
          pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.remote-path', `Remote or data URL is not a portable project asset: ${item.path}.`, context);
        } else {
          const absolute = path.resolve(projectRoot, item.path);
          if (!isPathInside(projectRoot, absolute)) {
            pushFinding(findings, 'error', 'item.path-escape', `Visual path escapes the deck project: ${item.path}.`, context);
          } else if (!fs.existsSync(absolute)) {
            pushFinding(findings, 'error', 'item.file-not-found', `Visual file not found: ${item.path}.`, context);
          } else if (!fs.statSync(absolute).isFile()) {
            pushFinding(findings, 'error', 'item.path-not-file', `Visual path is not a file: ${item.path}.`, context);
          } else if (parseRatio(item.slot)) {
            let dimensions = null;
            try { dimensions = readImageDimensions(absolute); }
            catch (error) { pushFinding(findings, strict ? 'error' : 'warning', 'item.dimension-read-failed', `Could not inspect image dimensions: ${error.message}`, context); }
            if (!dimensions) {
              pushFinding(findings, strict && stage === 'delivery' ? 'error' : 'warning', 'item.dimensions-unknown', `Could not determine dimensions for ${item.path}.`, context);
            } else {
              const target = parseRatio(item.slot);
              const actual = dimensions.width / dimensions.height;
              const delta = Math.abs(actual - target) / target;
              if (delta > ratioTolerance) pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.ratio-mismatch', `${item.path} is ${dimensions.width}×${dimensions.height} (${actual.toFixed(3)}), outside ${Math.round(ratioTolerance * 100)}% of slot ${item.slot} (${target.toFixed(3)}).`, { ...context, path: item.path, dimensions });
            }
          }
        }
      }
    }

    const deckSlide = deckSlides.get(item.slideId);
    if (deck && !deckSlide) pushFinding(findings, 'error', 'item.slide-not-in-deck', `Work order references unknown slide ${item.slideId}.`, context);
    if (deckSlide) {
      const visual = deckSlide.visual || {};
      for (const key of ['type', 'source', 'role', 'required']) {
        if (item[key] !== visual[key]) pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.deck-visual-drift', `${item.slideId} ${key} differs between work order (${item[key]}) and deck (${visual[key]}).`, { ...context, field: key });
      }
      if ((item.slot || '') !== (visual.slot || '')) pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.deck-slot-drift', `${item.slideId} slot differs between work order and deck.`, context);
      for (const key of ['status', 'path', 'alt', 'focus', 'prompt']) {
        if ((item[key] || '') !== (visual[key] || '')) pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'item.deck-sync-needed', `${item.slideId} ${key} has not been synchronized to deck.json.`, { ...context, field: key });
      }
    }
  }

  if (deck) {
    for (const slide of deck.slides || []) {
      if (!slideIds.has(slide.id)) pushFinding(findings, 'error', 'plan.slide-omitted', `Deck slide ${slide.id} has no visual work order.`, { slide: slide.id });
    }
    if (plan.deck?.id && deck.id && plan.deck.id !== deck.id) pushFinding(findings, 'error', 'plan.deck-id-mismatch', `Work orders belong to ${plan.deck.id}, not ${deck.id}.`);
  }

  const summary = summarizeWorkOrders(plan.items);
  const errors = findings.filter((finding) => finding.level === 'error').length;
  const warnings = findings.length - errors;
  return { findings, summary: { ...summary, errors, warnings }, stage };
}

const SYNC_FIELDS = ['assetId', 'type', 'required', 'status', 'source', 'role', 'slot', 'path', 'alt', 'focus', 'prompt', 'brief', 'exclusions', 'instructions', 'notes', 'credit', 'license'];

export function syncVisualWorkOrders(plan, deck, options = {}) {
  if (!plan?.deck?.id || !deck?.id || plan.deck.id !== deck.id) throw new Error(`Visual work orders belong to ${plan?.deck?.id || 'unknown'}, not ${deck?.id || 'unknown'}.`);
  if (!Array.isArray(plan.items) || !Array.isArray(deck.slides)) throw new Error('Visual work orders and deck slides must both be arrays.');
  const bySlide = new Map(plan.items.map((item) => [item.slideId, item]));
  const missing = deck.slides.filter((slide) => !bySlide.has(slide.id));
  if (missing.length) throw new Error(`Visual work orders omit deck slides: ${missing.map((slide) => slide.id).join(', ')}.`);
  const updated = structuredClone(deck);
  for (const slide of updated.slides) {
    const item = bySlide.get(slide.id);
    const visual = { ...(slide.visual || {}) };
    visual.assetId = item.id;
    for (const field of SYNC_FIELDS) {
      const sourceField = field === 'assetId' ? 'id' : field;
      if (item[sourceField] === undefined || item[sourceField] === '') delete visual[field];
      else visual[field] = structuredClone(item[sourceField]);
    }
    slide.visual = visual;
  }
  updated.visualProduction = {
    ...(updated.visualProduction || {}),
    workOrders: options.workOrders || 'qa/visual-work-orders.json',
    stage: options.stage || plan.stage || 'planning',
    syncedAt: options.syncedAt || new Date().toISOString(),
  };
  return updated;
}
