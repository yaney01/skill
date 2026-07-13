#!/usr/bin/env node
import fs from 'node:fs';

function replaceExactly(fileUrl, before, after, label) {
  const source = fs.readFileSync(fileUrl, 'utf8');
  if (source.includes(after)) {
    console.log(`${label}: already applied`);
    return false;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  fs.writeFileSync(fileUrl, source.replace(before, after), 'utf8');
  console.log(`${label}: applied`);
  return true;
}

const contract = new URL('./lib/visual-contract.mjs', import.meta.url);
const validator = new URL('./validate-manifest.mjs', import.meta.url);
let changed = false;

changed = replaceExactly(
  contract,
  `  const html = options.html || null;\n  const strict = Boolean(options.strict);`,
  `  const html = options.html || null;\n  const strict = Boolean(options.strict);\n  const stage = options.stage || 'delivery';\n  if (!['planning', 'delivery'].includes(stage)) pushFinding(findings, 'error', 'manifest.invalid-stage', \`Unknown manifest validation stage: \${stage}.\`);`,
  'visual contract stage option',
) || changed;

changed = replaceExactly(
  contract,
  `    if (visual.required && visual.status !== 'ready') pushFinding(findings, 'error', 'visual.required-not-ready', \`\${slide.id} requires a visual but status is \${visual.status}.\`, location);`,
  `    if (visual.required && visual.status === 'not-needed') {\n      pushFinding(findings, 'error', 'visual.required-not-needed', \`\${slide.id} requires a visual and cannot be marked not-needed.\`, location);\n    } else if (visual.required && visual.status !== 'ready') {\n      pushFinding(findings, stage === 'delivery' ? 'error' : 'warning', 'visual.required-not-ready', \`\${slide.id} requires a visual but status is \${visual.status}.\`, location);\n    }`,
  'required visual lifecycle',
) || changed;

changed = replaceExactly(
  validator,
  `  --html <deck.html>   Cross-check slide IDs, layouts, and required visuals against HTML.\n  --json <report.json> Write the complete validation report.\n  --strict             Treat warnings as failures.`,
  `  --html <deck.html>   Cross-check slide IDs, layouts, and required visuals against HTML.\n  --stage <stage>      planning or delivery. Defaults to delivery.\n  --json <report.json> Write the complete validation report.\n  --strict             Treat warnings as failures.`,
  'validator usage',
) || changed;

changed = replaceExactly(
  validator,
  `const strict = args.includes('--strict');\nif (!fs.existsSync(manifestPath)) {`,
  `const strict = args.includes('--strict');\nconst stage = option('--stage') || 'delivery';\nif (!['planning', 'delivery'].includes(stage)) {\n  console.error(\`Unknown stage: \${stage}. Use planning or delivery.\`);\n  process.exit(2);\n}\nif (!fs.existsSync(manifestPath)) {`,
  'validator stage parsing',
) || changed;

changed = replaceExactly(
  validator,
  `const result = validateManifestObject(manifest, { manifestPath, html, htmlPath, strict });`,
  `const result = validateManifestObject(manifest, { manifestPath, html, htmlPath, strict, stage });`,
  'validator stage forwarding',
) || changed;

changed = replaceExactly(
  validator,
  `console.log('Manifest validation complete');\nconsole.log(\`Slides: \${result.summary.slides}\`);`,
  `console.log('Manifest validation complete');\nconsole.log(\`Stage: \${stage}\`);\nconsole.log(\`Slides: \${result.summary.slides}\`);`,
  'validator stage output',
) || changed;

changed = replaceExactly(
  validator,
  `  strict,\n  layoutRegistry: manifest.layoutRegistry || null,`,
  `  strict,\n  stage,\n  layoutRegistry: manifest.layoutRegistry || null,`,
  'validator report stage',
) || changed;

if (!changed) console.log('No manifest stage changes required.');
// Trigger marker: phase-eleven-manifest-stage-v1
