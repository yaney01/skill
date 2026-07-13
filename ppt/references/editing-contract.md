# Browser editing contract

The generated deck uses constrained editing. Users may change content and image presentation while the authored layout system remains stable.

## Stable identifiers

Every slide needs a unique ID:

```html
<section class="slide" data-slide-id="slide-03" data-layout="split">
```

Every editable element needs:

```html
<h2 data-editable="text" data-element-id="slide-03-title">...</h2>
```

IDs must be unique, stable across revisions, lowercase, and semantic enough to inspect. Do not derive IDs from editable text. Versioned edit-state JSON is keyed by these IDs; changing an ID intentionally breaks its saved edit history.

## Editable text

Use `data-editable="text"` for:

- titles and subtitles
- body copy and bullets
- metrics, labels, captions, and source lines

The runtime adds `contenteditable` only while edit mode is active. Avoid nested editable regions.

Do not make these editable by default:

- decorative SVG paths
- pagination and controls
- layout-only labels used by JavaScript
- hidden accessibility text

Imported edit-state HTML is sanitized. Scriptable elements, inline event handlers, `srcdoc`, and `javascript:` URLs are removed before insertion.

## Editable images

Use:

```html
<img
  data-editable="image"
  data-element-id="slide-03-hero"
  data-image-slot="16:10"
  src="assets/hero.webp"
  alt="..."
/>
```

In edit mode:

- click an image to select it
- double-click it, or use **Replace image**, to open a local file picker
- choose `cover`, `contain`, or the theme default
- choose a focal position
- edit alternative text

Replacement images are converted to data URLs so they remain embedded when the user downloads the edited HTML.

The editor must preserve:

- image element classes
- aspect-ratio container
- source slot metadata
- current `object-fit`
- current `object-position`
- alternative text

Explicit browser changes are serialized as `data-fit`, `data-focus`, inline `object-fit`, inline `object-position`, and `alt` values. The theme default removes the browser override instead of guessing a theme value.

## Versioned local persistence

Autosave uses `localStorage`, keyed by the deck's `data-deck-id`. It is convenience storage, not the permanent source of truth.

The current envelope is version 2:

```json
{
  "version": 2,
  "deckId": "annual-review",
  "updatedAt": "2026-07-13T17:00:00Z",
  "elements": {
    "slide-03-title": {
      "type": "text",
      "html": "Updated title"
    },
    "slide-03-hero": {
      "type": "image",
      "src": "data:image/webp;base64,...",
      "alt": "Updated product view",
      "fit": "contain",
      "focus": "50% 50%"
    }
  }
}
```

Read [`../schemas/edit-state.schema.json`](../schemas/edit-state.schema.json).

Legacy flat snapshots are migrated automatically. Migration must retain existing image alt text and presentation metadata when the legacy record contains only `src`.

## Undo, redo, and reset

The editor maintains a bounded in-memory transaction history.

- **Undo**: `Ctrl/Cmd+Z`
- **Redo**: `Ctrl/Cmd+Shift+Z`; `Ctrl+Y` is also supported
- **Reset element**: restore the selected element to the authored HTML baseline
- **Reset slide**: restore editable elements on the current slide only
- **Reset all**: clear local edit storage and reload the authored deck

Reset element and reset slide are undoable. Reset all is intentionally destructive and requires confirmation.

History is local to the current browser session. Reloading begins a new history session from the restored state.

## Edit-state import and export

**Export edits** downloads the versioned JSON envelope. It is useful for review, backup, or moving edits between browsers without rewriting the HTML.

**Import edits** accepts version 2 JSON only and requires a matching `deckId`. Unknown element IDs are ignored. Unsafe text HTML and unsafe image URL schemes are rejected or sanitized.

Edit-state JSON does not change slide order, layouts, theme tokens, runtime code, or `deck.json` production decisions.

## Permanent HTML save

`Ctrl/Cmd+S` downloads the current serialized HTML. The downloaded file must include:

- current text edits
- embedded replacement images
- image fit, focus, and alt changes
- current slide order
- inline CSS and JavaScript
- the bundled presenter manifest when present

It must not include transient editor state such as:

- active selection classes
- `contenteditable="true"`
- spellcheck attributes added by edit mode
- editor toolbar or property controls
- generated slide-overview DOM

## Keyboard behavior

- `E`: toggle edit mode, except while typing in an editable field
- `Ctrl/Cmd+S`: download edited HTML and prevent the browser page-save dialog
- `Ctrl/Cmd+Z`: undo an editor transaction
- `Ctrl/Cmd+Shift+Z` or `Ctrl+Y`: redo
- `Esc`: finish the current text edit; when no field is active, exit edit mode
- navigation keys are disabled while typing

## Presenter isolation

Pages loaded with `?htmlppt-presenter-preview=1` must not initialize editor controls, selection, autosave, or edit-state import/export. Presenter previews are playback-only.

## Visual behavior

- edit controls remain outside the 1920×1080 stage
- entering edit mode must not reflow slide content
- editable elements may receive an outline, but no added padding or border width that changes layout
- editing long text may create overflow; the user should see it rather than the runtime silently shrinking typography
- the property panel must never become part of screenshots, contact sheets, PDF pages, or downloaded HTML

## Out of scope

- free dragging and resizing
- arbitrary x/y coordinates
- layers panel
- slide duplication, deletion, or reordering
- theme, font, and unrestricted color controls
- real-time collaboration
- cloud persistence
- comments and approvals
- user accounts and permissions
