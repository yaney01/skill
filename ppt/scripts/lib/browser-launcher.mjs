import { chromium, firefox, webkit } from 'playwright';

const BROWSERS = { chromium, firefox, webkit };

export function selectedBrowserName(explicit = null) {
  const name = explicit || process.env.HTML_PPT_BROWSER || 'chromium';
  if (!Object.hasOwn(BROWSERS, name)) {
    throw new Error(`Unsupported browser: ${name}. Use chromium, webkit, or firefox.`);
  }
  return name;
}

export function selectedBrowserType(explicit = null) {
  return BROWSERS[selectedBrowserName(explicit)];
}
