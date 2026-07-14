#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditAccessibilityPage } from './lib/accessibility-audit.mjs';
import { selectedBrowserName, selectedBrowserType } from './lib/browser-launcher.mjs';

const args = process.argv.slice(2);
const file = args[0];
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const strict = args.includes('--strict');
const jsonPath = option('--json');
const browserName = selectedBrowserName(option('--browser'));

if (!file) {
  console.error('Usage: node scripts/qa-accessibility.mjs deck.html [--browser chromium|webkit|firefox] [--json report.json] [--strict]');
  process.exit(2);
}

const absolute = path.resolve(file);
if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(2);
}

const browser = await selectedBrowserType(browserName).launch({ headless: true });
let report;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(pathToFileURL(absolute).href, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('.slide').length > 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  report = await auditAccessibilityPage(page);
  pageErrors.forEach((message) => report.findings.push({ severity: 'error', code: 'runtime.page-error', message, location: null }));
  report.summary.errors = report.findings.filter((finding) => finding.severity === 'error').length;
  report.summary.warnings = report.findings.filter((finding) => finding.severity === 'warning').length;
  report.browser = browserName;
  report.file = absolute;
  report.generatedAt = new Date().toISOString();
} finally {
  await browser.close();
}

if (jsonPath) {
  const output = path.resolve(jsonPath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(`Accessibility QA (${browserName})`);
console.log(`Slides: ${report.summary.slides}`);
console.log(`Errors: ${report.summary.errors}`);
console.log(`Warnings: ${report.summary.warnings}`);
for (const finding of report.findings) {
  const location = finding.location ? ` [${finding.location}]` : '';
  console.log(`${finding.severity.toUpperCase()} ${finding.code}${location}: ${finding.message}`);
}

const failed = report.summary.errors > 0 || (strict && report.summary.warnings > 0);
process.exit(failed ? 1 : 0);
