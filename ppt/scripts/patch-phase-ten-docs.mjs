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

let changed = false;
const readme = new URL('../README.md', import.meta.url);
const skill = new URL('../SKILL.md', import.meta.url);

changed = replaceExactly(
  readme,
  `- Browser text editing and image replacement\n- Local autosave and edited-HTML download`,
  `- Versioned constrained browser editing with undo/redo and scoped reset\n- Image replacement, fit, focus, and alt-text controls\n- Local autosave, edit-state JSON import/export, and edited-HTML download`,
  'README capability list',
) || changed;

changed = replaceExactly(
  readme,
  `- edit-mode activation and exit\n- text autosave and reload restoration\n- image replacement with embedded Data URLs\n- edited self-contained HTML download\n- semantic visual QA and contact-sheet generation`,
  `- edit-mode activation and presenter-preview isolation\n- version 2 local edit-state persistence and legacy migration\n- transaction-based undo/redo\n- selected-element and current-slide reset\n- image replacement with embedded Data URLs\n- image fit, focal position, and alt-text persistence\n- sanitized edit-state JSON import/export\n- edited self-contained HTML download without transient editor UI\n- semantic visual QA and contact-sheet generation`,
  'README browser coverage',
) || changed;

changed = replaceExactly(
  readme,
  `## Editing controls in generated decks\n\n- \`←\` / \`→\`, \`PageUp\` / \`PageDown\`, or \`Space\`: navigate\n- Mouse wheel or horizontal swipe: navigate\n- \`Home\` / \`End\`: first or last slide\n- \`E\`: toggle edit mode\n- Click editable text: edit in place\n- Click an editable image: replace it locally\n- \`Ctrl/Cmd+S\`: download the current edited HTML\n- \`Esc\`: exit text editing or edit mode\n\n## Design scope\n\nThe editor is intentionally constrained. It supports content edits and image replacement while preserving the authored grid and hierarchy. Free-form dragging, resizing, layers, cloud sync, comments, permissions, and multiplayer editing are not included.`,
  `## Playback, presenter, and editing controls\n\nPlayback:\n\n- \`←\` / \`→\`, \`PageUp\` / \`PageDown\`, or \`Space\`: navigate\n- Mouse wheel or horizontal swipe: navigate\n- \`Home\` / \`End\`: first or last slide\n- \`P\`: open the presenter window\n- \`Esc\`: open or close slide overview when edit mode is inactive\n- \`G\`: jump to a numbered slide\n\nConstrained editing:\n\n- \`E\`: toggle edit mode\n- Click editable text: edit in place\n- Click an editable image: select it; double-click or choose **Replace image** to replace it\n- Image properties: theme default / cover / contain, focal position, and alt text\n- \`Ctrl/Cmd+Z\`: undo\n- \`Ctrl/Cmd+Shift+Z\` or \`Ctrl+Y\`: redo\n- **Reset element**: restore the selected authored element\n- **Reset slide**: restore editable content on the current slide\n- **Export edits / Import edits**: transfer version 2 edit-state JSON for the same deck\n- \`Ctrl/Cmd+S\`: download the current edited HTML\n- \`Esc\`: finish text editing or exit edit mode\n\nSee [`references/editing-contract.md`](./references/editing-contract.md), [`schemas/edit-state.schema.json`](./schemas/edit-state.schema.json), and [`references/presenter-mode.md`](./references/presenter-mode.md).\n\n## Design scope\n\nThe editor is intentionally constrained. It edits only existing \`data-editable\` elements while preserving the authored grid, hierarchy, source mapping, and registered layout. Free-form dragging, resizing, arbitrary coordinates, slide duplication/deletion/reordering, layers, unrestricted theme controls, cloud sync, comments, permissions, and multiplayer editing are not included.`,
  'README control reference',
) || changed;

changed = replaceExactly(
  skill,
  `| \`references/editing-contract.md\` | Browser editing and stable element IDs |\n| \`references/quality-checklist.md\` | Mechanical final QA |`,
  `| \`references/editing-contract.md\` | Versioned constrained browser editing and stable element IDs |\n| \`schemas/edit-state.schema.json\` | Browser edit-state import/export contract |\n| \`references/presenter-mode.md\` | Presenter notes, popup, overview, and offline behavior |\n| \`references/quality-checklist.md\` | Mechanical final QA |`,
  'Skill resource guide',
) || changed;

changed = replaceExactly(
  skill,
  `- keep development runtime code in \`runtime/\` and use the bundler for final inlining`,
  `- keep development runtime code in \`runtime/\` and use the bundler for final inlining\n- keep browser editing constrained to existing \`data-editable\` elements; do not add free dragging, arbitrary coordinates, or structural page editing\n- preserve stable \`data-element-id\` values so versioned edit-state JSON and local autosave remain compatible`,
  'Skill modification rules',
) || changed;

if (!changed) console.log('No documentation changes required.');
