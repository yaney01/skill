export async function auditAccessibilityPage(page) {
  return page.evaluate(() => {
    const findings = [];
    const push = (severity, code, message, location = null) => findings.push({ severity, code, message, location });
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      }
      const label = element.labels?.[0]?.textContent || '';
      return (element.getAttribute('aria-label') || label || element.getAttribute('title') || element.textContent || element.getAttribute('alt') || '').trim();
    };
    const parseRgb = (value) => {
      const match = value?.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.slice(0, 3).some((value) => Number.isNaN(value))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const luminance = ({ r, g, b }) => {
      const values = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    };
    const contrast = (foreground, background) => {
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const effectiveBackground = (element) => {
      let current = element;
      while (current && current !== document.documentElement) {
        const style = getComputedStyle(current);
        if (style.backgroundImage && style.backgroundImage !== 'none') return null;
        const color = parseRgb(style.backgroundColor);
        if (color && color.a >= 0.95) return color;
        current = current.parentElement;
      }
      return parseRgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    };

    if (!document.documentElement.lang.trim()) push('error', 'document.lang-missing', 'The document must declare a non-empty html lang attribute.', 'html');
    if (!document.title.trim()) push('error', 'document.title-missing', 'The document must have a non-empty title.', 'head > title');

    const stage = document.getElementById('deckStage') || document.querySelector('.deck-stage');
    if (!stage) push('error', 'deck.stage-missing', 'The deck stage is missing.', '#deckStage');

    const ids = new Map();
    document.querySelectorAll('[id]').forEach((element) => {
      const id = element.id;
      if (!ids.has(id)) ids.set(id, []);
      ids.get(id).push(element);
    });
    for (const [id, elements] of ids) {
      if (elements.length > 1) push('error', 'document.duplicate-id', `Duplicate id: ${id}.`, `#${id}`);
    }

    const slides = [...document.querySelectorAll('.slide')];
    const activeSlides = slides.filter((slide) => slide.classList.contains('active'));
    if (activeSlides.length !== 1) push('error', 'deck.active-slide-count', `Expected exactly one active slide, found ${activeSlides.length}.`, '.slide.active');
    const slideIds = new Set();
    slides.forEach((slide, index) => {
      const id = slide.dataset.slideId;
      if (!id) push('error', 'slide.id-missing', `Slide ${index + 1} is missing data-slide-id.`, `.slide:nth-of-type(${index + 1})`);
      else if (slideIds.has(id)) push('error', 'slide.id-duplicate', `Duplicate slide id: ${id}.`, `[data-slide-id="${id}"]`);
      else slideIds.add(id);
      const active = slide.classList.contains('active');
      const ariaHidden = slide.getAttribute('aria-hidden');
      if (active && ariaHidden === 'true') push('error', 'slide.active-hidden', `${id || `Slide ${index + 1}`} is active but aria-hidden is true.`, id || null);
      if (!active && ariaHidden !== 'true') push('error', 'slide.inactive-exposed', `${id || `Slide ${index + 1}`} is inactive but is not aria-hidden.`, id || null);
      if (!slide.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) push('warning', 'slide.heading-missing', `${id || `Slide ${index + 1}`} has no semantic heading.`, id || null);
    });

    document.querySelectorAll('img').forEach((image) => {
      if (!image.hasAttribute('alt')) push('error', 'image.alt-missing', 'Every image must have an alt attribute. Use alt="" for decoration.', image.dataset.elementId || image.getAttribute('src'));
    });

    document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="link"]').forEach((control) => {
      if (!visible(control)) return;
      if (!accessibleName(control)) push('error', 'control.name-missing', 'Interactive controls need an accessible name.', control.id || control.dataset.editorAction || control.tagName.toLowerCase());
    });

    document.querySelectorAll('[aria-controls]').forEach((element) => {
      const target = element.getAttribute('aria-controls');
      if (target && !document.getElementById(target)) push('error', 'aria.controls-missing', `aria-controls references missing id: ${target}.`, element.id || element.tagName.toLowerCase());
    });

    const textSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,label,button,a,[data-editable="text"]';
    document.querySelectorAll(textSelector).forEach((element) => {
      if (!visible(element) || !element.textContent.trim()) return;
      const style = getComputedStyle(element);
      const foreground = parseRgb(style.color);
      const background = effectiveBackground(element);
      if (!foreground || !background || foreground.a < 0.95) return;
      const ratio = contrast(foreground, background);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const minimum = large ? 3 : 4.5;
      if (ratio + 0.05 < minimum) {
        push('warning', 'color.contrast-low', `Approximate text contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1. Review against the actual background.`, element.dataset.elementId || element.tagName.toLowerCase());
      }
    });

    return {
      findings,
      summary: {
        errors: findings.filter((finding) => finding.severity === 'error').length,
        warnings: findings.filter((finding) => finding.severity === 'warning').length,
        slides: slides.length,
        images: document.querySelectorAll('img').length,
        controls: document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="link"]').length,
      },
    };
  });
}
