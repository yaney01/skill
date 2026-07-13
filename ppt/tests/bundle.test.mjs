import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { bundleExample, combinedOutput, exampleHtml, runNode, temporaryDirectory } from './helpers.mjs';

test('the real example bundles into a portable single HTML file', () => {
  const directory = temporaryDirectory('html-ppt-bundle-test-');
  const output = bundleExample(directory);
  const html = fs.readFileSync(output, 'utf8');

  assert.match(html, /Bundled by html-ppt-agent-skill/);
  assert.match(html, /data-bundled-from="\.\.\/\.\.\/assets\/runtime\/viewport-base\.css"/);
  assert.match(html, /data-bundled-from="\.\.\/\.\.\/assets\/runtime\/deck-runtime\.js"/);
  assert.match(html, /data-bundled-from="\.\.\/\.\.\/assets\/runtime\/deck-editor\.js"/);
  assert.match(html, /id="htmlPptManifest"/);
  assert.match(html, /先说明这不是一次单纯的 AI 出图分享/);
  assert.match(html, /data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(html, /(?:src|href)="(?:\.\.\/|\.\/|images\/)/);

  const validation = runNode(['scripts/validate-deck.mjs', output]);
  assert.equal(validation.status, 0, combinedOutput(validation));
});

test('the bundler refuses to overwrite its source file', () => {
  const result = runNode(['scripts/bundle-html.mjs', exampleHtml, exampleHtml]);
  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /Output must not overwrite the source HTML/);
});
