#!/usr/bin/env node
import fs from 'node:fs';

const readmeUrl = new URL('../README.md', import.meta.url);
const skillUrl = new URL('../SKILL.md', import.meta.url);
let readme = fs.readFileSync(readmeUrl, 'utf8');
let skill = fs.readFileSync(skillUrl, 'utf8');
let changed = false;

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) {
    console.log(`${label}: already applied`);
    return source;
  }
  if (!source.includes(before)) {
    console.log(`${label}: source text not present; skipped`);
    return source;
  }
  changed = true;
  console.log(`${label}: applied`);
  return source.replace(before, after);
}

readme = replaceOnce(
  readme,
  '- Browser text editing and image replacement\n- Local autosave and edited-HTML download',
  '- Versioned constrained browser editing with undo/redo and scoped reset\n- Image replacement, fit, focus, and alt-text controls\n- Local autosave, edit-state JSON import/export, and edited-HTML download',
  'README capability list',
);

readme = replaceOnce(
  readme,
  '- edit-mode activation and exit\n- text autosave and reload restoration\n- image replacement with embedded Data URLs\n- edited self-contained HTML download\n- semantic visual QA and contact-sheet generation',
  '- edit-mode activation and presenter-preview isolation\n- version 2 local edit-state persistence and legacy migration\n- transaction-based undo/redo\n- selected-element and current-slide reset\n- image replacement with embedded Data URLs\n- image fit, focal position, and alt-text persistence\n- sanitized edit-state JSON import/export\n- edited self-contained HTML download without transient editor UI\n- semantic visual QA and contact-sheet generation',
  'README browser coverage',
);

const readmeTail = `## Playback, presenter, and editing controls

Playback:

- \`←\` / \`→\`, \`PageUp\` / \`PageDown\`, or \`Space\`: navigate
- Mouse wheel or horizontal swipe: navigate
- \`Home\` / \`End\`: first or last slide
- \`P\`: open the presenter window
- \`Esc\`: open or close slide overview when edit mode is inactive
- \`G\`: jump to a numbered slide

Constrained editing:

- \`E\`: toggle edit mode
- Click editable text: edit in place
- Click an editable image: select it; double-click or choose **Replace image** to replace it
- Image properties: theme default / cover / contain, focal position, and alt text
- \`Ctrl/Cmd+Z\`: undo
- \`Ctrl/Cmd+Shift+Z\` or \`Ctrl+Y\`: redo
- **Reset element**: restore the selected authored element
- **Reset slide**: restore editable content on the current slide
- **Export edits / Import edits**: transfer version 2 edit-state JSON for the same deck
- \`Ctrl/Cmd+S\`: download the current edited HTML
- \`Esc\`: finish text editing or exit edit mode

See [\`references/editing-contract.md\`](./references/editing-contract.md), [\`schemas/edit-state.schema.json\`](./schemas/edit-state.schema.json), and [\`references/presenter-mode.md\`](./references/presenter-mode.md).

## Design scope

The editor is intentionally constrained. It edits only existing \`data-editable\` elements while preserving the authored grid, hierarchy, source mapping, and registered layout. Free-form dragging, resizing, arbitrary coordinates, slide duplication/deletion/reordering, layers, unrestricted theme controls, cloud sync, comments, permissions, and multiplayer editing are not included.
`;
if (!readme.includes('## Playback, presenter, and editing controls')) {
  const marker = '## Editing controls in generated decks';
  const index = readme.indexOf(marker);
  if (index >= 0) {
    readme = `${readme.slice(0, index)}${readmeTail}`;
    changed = true;
    console.log('README control reference: applied');
  }
}

skill = replaceOnce(
  skill,
  '| `references/editing-contract.md` | Browser editing and stable element IDs |\n| `references/quality-checklist.md` | Mechanical final QA |',
  '| `references/editing-contract.md` | Versioned constrained browser editing and stable element IDs |\n| `schemas/edit-state.schema.json` | Browser edit-state import/export contract |\n| `references/presenter-mode.md` | Presenter notes, popup, overview, and offline behavior |\n| `references/quality-checklist.md` | Mechanical final QA |',
  'Skill resource guide',
);

skill = replaceOnce(
  skill,
  '- keep development runtime code in `runtime/` and use the bundler for final inlining',
  '- keep development runtime code in `runtime/` and use the bundler for final inlining\n- keep browser editing constrained to existing `data-editable` elements; do not add free dragging, arbitrary coordinates, or structural page editing\n- preserve stable `data-element-id` values so versioned edit-state JSON and local autosave remain compatible',
  'Skill modification rules',
);

if (changed) {
  fs.writeFileSync(readmeUrl, readme, 'utf8');
  fs.writeFileSync(skillUrl, skill, 'utf8');
} else {
  console.log('No documentation changes required.');
}
