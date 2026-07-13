import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const pptRoot = path.resolve(here, '..');
export const exampleHtml = path.join(pptRoot, 'examples', 'ai-ad-workflow', 'index.html');

export function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: pptRoot,
    encoding: 'utf8',
    ...options,
  });
}

export function temporaryDirectory(prefix = 'html-ppt-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function bundleExample(outputDirectory = temporaryDirectory('html-ppt-bundle-')) {
  const output = path.join(outputDirectory, 'ai-ad-workflow.html');
  const result = runNode(['scripts/bundle-html.mjs', exampleHtml, output]);
  if (result.status !== 0) {
    throw new Error(`Bundling failed:\n${result.stdout}\n${result.stderr}`);
  }
  return output;
}

export function fileUrl(filePath, hash = '') {
  return `${pathToFileURL(filePath).href}${hash}`;
}

export function combinedOutput(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}
