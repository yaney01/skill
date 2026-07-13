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

const file = new URL('./create-deck.mjs', import.meta.url);
let changed = false;

changed = replaceExactly(
  file,
  `import { fileURLToPath } from 'node:url';`,
  `import { fileURLToPath } from 'node:url';\nimport { buildVisualWorkOrders, writeVisualWorkOrders } from './lib/visual-work-orders.mjs';`,
  'create-deck visual work-order import',
) || changed;

changed = replaceExactly(
  file,
  `  fs.writeFileSync(path.join(outputDirectory, 'index.html'), html, 'utf8');\n  fs.writeFileSync(path.join(outputDirectory, 'deck.json'), \`\${JSON.stringify(metadata, null, 2)}\\n\`, 'utf8');\n  fs.writeFileSync(path.join(outputDirectory, 'README.md'), buildProjectReadme({ title, deckId, theme, sourceInfo }), 'utf8');`,
  `  const deckPath = path.join(outputDirectory, 'deck.json');\n  fs.writeFileSync(path.join(outputDirectory, 'index.html'), html, 'utf8');\n  fs.writeFileSync(deckPath, \`\${JSON.stringify(metadata, null, 2)}\\n\`, 'utf8');\n  const visualPlan = buildVisualWorkOrders(metadata, { stage: 'planning' });\n  writeVisualWorkOrders(visualPlan, {\n    jsonPath: path.join(outputDirectory, 'qa', 'visual-work-orders.json'),\n    markdownPath: path.join(outputDirectory, 'qa', 'visual-work-orders.md'),\n    manifestPath: deckPath,\n    force: true,\n  });\n  fs.writeFileSync(path.join(outputDirectory, 'README.md'), buildProjectReadme({ title, deckId, theme, sourceInfo }), 'utf8');`,
  'create-deck work-order generation',
) || changed;

changed = replaceExactly(
  file,
  `  console.log(\`Manifest slides: \${metadata.slides.length}\`);\n  console.log(sourceInfo ? 'Next: review source/manifest.json and complete deck.json.source.mapping before authoring.' : 'Next: select registered layouts and complete the visual plan in deck.json.');`,
  `  console.log(\`Manifest slides: \${metadata.slides.length}\`);\n  console.log('Visual work orders: qa/visual-work-orders.json and qa/visual-work-orders.md');\n  console.log(sourceInfo ? 'Next: review source/manifest.json, complete deck.json.source.mapping, then update the visual work orders.' : 'Next: select registered layouts and update the visual work orders before production.');`,
  'create-deck next step output',
) || changed;

if (!changed) console.log('No create-deck changes required.');
