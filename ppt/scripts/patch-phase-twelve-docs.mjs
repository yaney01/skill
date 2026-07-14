#!/usr/bin/env node
import fs from 'node:fs';

function read(url) { return fs.readFileSync(url, 'utf8'); }
function write(url, content) { fs.writeFileSync(url, content, 'utf8'); }

function replaceOnce(url, before, after, label) {
  let source = read(url);
  if (source.includes(after)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
  write(url, source);
  console.log(`${label}: applied`);
  return true;
}

function insertBefore(url, marker, block, sentinel, label) {
  let source = read(url);
  if (source.includes(sentinel)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = `${source.slice(0, index)}${block}\n\n${source.slice(index)}`;
  write(url, source);
  console.log(`${label}: applied`);
  return true;
}

const readme = new URL('../README.md', import.meta.url);
const skill = new URL('../SKILL.md', import.meta.url);
const checklist = new URL('../references/quality-checklist.md', import.meta.url);
let changed = false;

changed = replaceOnce(
  readme,
  '- **Tooling:** Node.js 20+ and Python 3; Playwright is required for rendered QA, PDF export, and browser interaction tests',
  '- **Tooling:** Node.js 20+, npm 10.8.2, Python 3, and the committed `package-lock.json`; Playwright is required for rendered QA, PDF export, accessibility, and browser interaction tests',
  'README tooling contract',
) || changed;

changed = replaceOnce(
  readme,
  '- Structural validation, source validation, rendered QA, semantic visual QA, contact sheets, and PDF export\n- Automated source, structure, bundling, runtime, editor, theme, CJK, manifest, and visual regression tests',
  '- Structural validation, source validation, rendered QA, semantic visual QA, accessibility QA, contact sheets, and PDF export\n- Deterministic permanent CI with Chromium and WebKit release gates\n- Automated source, structure, bundling, runtime, editor, presenter, accessibility, theme, CJK, manifest, and visual regression tests',
  'README hardened capabilities',
) || changed;

changed = replaceOnce(
  readme,
  '```bash\nnpm install\nnpx playwright install chromium\n\nnode scripts/qa-deck.mjs',
  '```bash\nnpm ci\nnpx playwright install chromium webkit\n\nnode scripts/qa-deck.mjs',
  'README deterministic rendered install',
) || changed;

changed = replaceOnce(
  readme,
  'node scripts/qa-visual.mjs \\\n  /absolute/path/to/project/index.html \\\n  --manifest /absolute/path/to/project/deck.json \\\n  --json /absolute/path/to/project/qa/visual-report.json\n\nnode scripts/build-contact-sheet.mjs',
  'node scripts/qa-visual.mjs \\\n  /absolute/path/to/project/index.html \\\n  --manifest /absolute/path/to/project/deck.json \\\n  --json /absolute/path/to/project/qa/visual-report.json\n\nnode scripts/qa-accessibility.mjs \\\n  /absolute/path/to/project/index.html \\\n  --browser chromium \\\n  --json /absolute/path/to/project/qa/accessibility-report.json\n\nHTML_PPT_BROWSER=webkit npm run test:browser-smoke\n\nnode scripts/build-contact-sheet.mjs',
  'README accessibility commands',
) || changed;

changed = replaceOnce(
  readme,
  '```bash\nnpm install\nnpx playwright install chromium\nnpm run test:browser\n```',
  '```bash\nnpm ci\nnpx playwright install chromium webkit\nnpm run test:browser\nHTML_PPT_BROWSER=webkit npm run test:browser-smoke\nHTML_PPT_BROWSER=webkit npm run test:accessibility\n```',
  'README browser test commands',
) || changed;

changed = insertBefore(
  readme,
  '## PDF behavior',
  [
    '## Release hardening and permanent CI',
    '',
    '<!-- phase-twelve-readme -->',
    'The repository commits `package-lock.json` and uses `npm ci` for deterministic verification. The permanent workflow is `.github/workflows/ppt-ci.yml`.',
    '',
    'Stable release checks:',
    '',
    '- `PPT contracts`',
    '- `PPT browser (chromium)`',
    '- `PPT browser (webkit)`',
    '- `PPT rendered regression`',
    '',
    'Chromium runs the complete runtime, presenter, editor, visual, accessibility, task, and production-example chain. WebKit is a required Safari-compatible gate for bundled playback, navigation, constrained editing, reduced motion, offline manifest loading, and accessibility.',
    '',
    'Failed jobs retain JSON reports, screenshots, contact sheets, and rendered task artifacts for diagnosis.',
    '',
    'See [`references/release-ci.md`](./references/release-ci.md), [`references/accessibility-qa.md`](./references/accessibility-qa.md), [`CHANGELOG.md`](./CHANGELOG.md), and [`MIGRATIONS.md`](./MIGRATIONS.md).',
  ].join('\n'),
  '<!-- phase-twelve-readme -->',
  'README release section',
) || changed;

changed = replaceOnce(
  skill,
  '```bash\nnpm install\nnpx playwright install chromium\n```',
  '```bash\nnpm ci\nnpx playwright install chromium webkit\n```',
  'Skill deterministic Playwright install',
) || changed;

changed = replaceOnce(
  skill,
  'Whole-deck contact sheet:\n\n```bash\nnode scripts/build-contact-sheet.mjs',
  'Accessibility QA:\n\n```bash\nnode scripts/qa-accessibility.mjs \\\n  /absolute/path/to/project/index.html \\\n  --browser chromium \\\n  --json /absolute/path/to/project/qa/accessibility-report.json\n\nHTML_PPT_BROWSER=webkit npm run test:browser-smoke\nHTML_PPT_BROWSER=webkit npm run test:accessibility\n```\n\nWhole-deck contact sheet:\n\n```bash\nnode scripts/build-contact-sheet.mjs',
  'Skill accessibility QA sequence',
) || changed;

changed = replaceOnce(
  skill,
  '`qa-deck.mjs` checks rendering integrity. `qa-visual.mjs` checks declared visual requirements, evidence coverage, consecutive text-only slides, repeated layouts/images, alt text, source resolution, slot ratios, crop focus, and text/visual overlap. P0 blocks delivery; P1 requires review; P2 is an improvement suggestion.',
  '`qa-deck.mjs` checks rendering integrity. `qa-visual.mjs` checks declared visual requirements, evidence coverage, consecutive text-only slides, repeated layouts/images, alt text, source resolution, slot ratios, crop focus, and text/visual overlap. `qa-accessibility.mjs` checks document language, titles, stable IDs, slide exposure state, image alt attributes, control names, ARIA references, approximate contrast, and runtime errors. Chromium and WebKit release gates must pass. P0 blocks delivery; P1 requires review; P2 is an improvement suggestion.',
  'Skill QA definitions',
) || changed;

changed = replaceOnce(
  skill,
  '- structural, source, mechanical, manifest, and visual QA separately\n- contact sheet path',
  '- structural, source, mechanical, manifest, visual, accessibility, and cross-browser QA separately\n- accessibility report and contact sheet paths',
  'Skill delivery report',
) || changed;

changed = replaceOnce(
  skill,
  '| `references/presenter-mode.md` | Presenter notes, popup, overview, and offline behavior |\n| `references/quality-checklist.md` | Mechanical final QA |',
  '| `references/presenter-mode.md` | Presenter notes, popup, overview, and offline behavior |\n| `references/accessibility-qa.md` | Automated and manual accessibility release checks |\n| `references/release-ci.md` | Permanent CI, deterministic installation, browser gates, and artifacts |\n| `CHANGELOG.md` | Versioned capability and compatibility history |\n| `MIGRATIONS.md` | Project, manifest, edit-state, and release upgrade procedures |\n| `references/quality-checklist.md` | Mechanical final QA |',
  'Skill release resources',
) || changed;

changed = replaceOnce(
  checklist,
  '- [ ] All required images load.\n- [ ] Navigation works with keyboard and touch/mouse input.',
  '- [ ] All required images load and every image has an appropriate `alt` attribute.\n- [ ] The document declares language and title metadata.\n- [ ] Visible controls have accessible names and valid ARIA references.\n- [ ] Exactly one active slide is exposed to assistive technology; inactive slides are `aria-hidden`.\n- [ ] Navigation works with keyboard and touch/mouse input.',
  'Checklist accessibility P0',
) || changed;

changed = replaceOnce(
  checklist,
  '- [ ] Downloaded edited HTML reopens with the edits preserved.\n- [ ] Facts, numbers, dates, units, names, and citations match the source.',
  '- [ ] Downloaded edited HTML reopens with the edits preserved.\n- [ ] The final bundled HTML passes the Chromium and WebKit release smoke tests.\n- [ ] Accessibility QA reports no blocking errors.\n- [ ] Facts, numbers, dates, units, names, and citations match the source.',
  'Checklist browser release gates',
) || changed;

changed = insertBefore(
  checklist,
  '## Final smoke test',
  [
    '## Accessibility and browser validation',
    '',
    '<!-- phase-twelve-quality -->',
    'Run:',
    '',
    '```bash',
    'node scripts/qa-accessibility.mjs deck.html --browser chromium --json qa/accessibility-report.json',
    'HTML_PPT_BROWSER=webkit npm run test:browser-smoke',
    'HTML_PPT_BROWSER=webkit npm run test:accessibility',
    '```',
    '',
    'Review contrast warnings manually. Gradients, images, transparency, projection conditions, and screen-reader usefulness cannot be certified by geometry alone.',
    '',
  ].join('\n'),
  '<!-- phase-twelve-quality -->',
  'Checklist release QA section',
) || changed;

console.log(changed ? 'Phase twelve documentation integration applied.' : 'No phase twelve documentation changes required.');
