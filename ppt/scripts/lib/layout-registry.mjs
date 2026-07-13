import fs from 'node:fs';
import path from 'node:path';

export function validateRegisteredLayouts(manifest, manifestPath) {
  const findings = [];
  if (!manifest?.layoutRegistry) return { findings, registry: null, registered: 0 };
  const root = path.dirname(path.resolve(manifestPath));
  const registryPath = path.resolve(root, manifest.layoutRegistry);
  const relative = path.relative(root, registryPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
    findings.push({ level: 'error', code: 'layout.registry-path-escape', message: `layoutRegistry escapes the project directory: ${manifest.layoutRegistry}.` });
    return { findings, registry: null, registered: 0 };
  }
  if (!fs.existsSync(registryPath)) {
    findings.push({ level: 'error', code: 'layout.registry-not-found', message: `Layout registry not found: ${manifest.layoutRegistry}.` });
    return { findings, registry: null, registered: 0 };
  }
  let registry;
  try { registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')); }
  catch (error) {
    findings.push({ level: 'error', code: 'layout.registry-invalid-json', message: `Layout registry is invalid JSON: ${error.message}.` });
    return { findings, registry: null, registered: 0 };
  }
  if (!Array.isArray(registry.layouts)) {
    findings.push({ level: 'error', code: 'layout.registry-invalid', message: 'Layout registry must contain a layouts array.' });
    return { findings, registry, registered: 0 };
  }
  if (manifest.style && registry.theme && manifest.style !== registry.theme) {
    findings.push({ level: 'error', code: 'layout.registry-theme-mismatch', message: `Deck style ${manifest.style} differs from registry theme ${registry.theme}.` });
  }
  const ids = new Set();
  for (const item of registry.layouts) {
    if (!item?.id || ids.has(item.id)) findings.push({ level: 'error', code: 'layout.registry-duplicate', message: `Invalid or duplicate registered layout: ${item?.id || 'undefined'}.` });
    else ids.add(item.id);
  }
  const aliases = registry.legacyAliases && typeof registry.legacyAliases === 'object' ? registry.legacyAliases : {};
  for (const slide of Array.isArray(manifest.slides) ? manifest.slides : []) {
    if (!slide?.layout) continue;
    if (ids.has(slide.layout)) continue;
    if (aliases[slide.layout] && ids.has(aliases[slide.layout])) {
      findings.push({ level: 'warning', code: 'layout.legacy-alias', message: `${slide.id} uses legacy layout ${slide.layout}; use ${aliases[slide.layout]}.`, slide: slide.id });
      continue;
    }
    findings.push({ level: 'error', code: 'layout.unregistered', message: `${slide.id} uses unregistered layout ${slide.layout}.`, slide: slide.id });
  }
  return { findings, registry, registered: ids.size };
}
