# Browser editing contract

The generated deck uses constrained editing. Users may change content while the authored layout system remains stable.

## Stable identifiers

Every slide needs a unique ID:

```html
<section class="slide" data-slide-id="slide-03" data-layout="split">
```

Every editable element needs:

```html
<h2 data-editable="text" data-element-id="slide-03-title">...</h2>
```

IDs must be unique, stable across revisions, lowercase, and semantic enough to inspect. Do not derive IDs from editable text.

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

In edit mode, clicking the image opens a local file picker. The selected image is converted to a data URL so it remains embedded when the user downloads the edited HTML.

The editor must preserve:

- image element classes
- `object-fit` and `object-position`
- aspect-ratio container
- alt text unless separately edited

## Local persistence

Autosave uses `localStorage`, keyed by the deck's `data-deck-id`. It is convenience storage, not the permanent source of truth.

Permanent save downloads the current serialized HTML. The downloaded file must include:

- current text edits
- embedded replacement images
- current slide order
- inline CSS and JavaScript

It must not include transient editor state such as active selection outlines or `contenteditable="true"`.

## Keyboard behavior

- `E`: toggle edit mode, except while typing in an editable field
- `Ctrl/Cmd+S`: download the edited HTML and prevent the browser's page-save dialog
- `Esc`: finish current text edit; when no field is active, exit edit mode
- navigation keys are disabled while typing

## Visual behavior

- edit controls remain outside the 1920×1080 stage
- entering edit mode must not reflow slide content
- editable elements may receive an outline, but no added padding or border width that changes layout
- editing long text may create overflow; the user should see it rather than the runtime silently shrinking typography

## Out of scope

- free dragging and resizing
- layers panel
- real-time collaboration
- cloud persistence
- comments and approvals
- user accounts and permissions
