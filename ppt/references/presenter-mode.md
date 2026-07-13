# Presenter mode

The HTML PPT runtime includes a lightweight, offline-capable presenter view. It is designed for meetings, reviews, training, and live talks without turning the deck runtime into a collaboration platform.

## Controls

| Key | Action |
|---|---|
| `P` | Open the presenter window |
| `Esc` | Open or close the slide overview |
| `G` | Enter a slide number and jump |
| Arrow keys / Page Up / Page Down / Space | Normal slide navigation |

The presenter window contains:

- current-slide preview
- next-slide preview
- current page and total page count
- speaker notes
- elapsed timer with reset
- previous, next, and go-to-slide controls

Presenter controls and audience-window controls synchronize in both directions.

## Speaker notes contract

Store notes in `deck.json`, not in HTML attributes. The production schema currently defines each slide note as a string:

```json
{
  "id": "slide-05",
  "headline": "Human review remains accountable",
  "notes": "Explain that AI can perform screening, while brand and business judgment remain human responsibilities."
}
```

Keep notes concise enough to scan while speaking. Structured timing, privacy metadata, and note editing are deferred until the editor-state contract is versioned.

## Development and bundled delivery

In a development project, the runtime loads the sibling `deck.json` file. During single-file bundling, `bundle-html.mjs` embeds the current manifest as:

```html
<script type="application/json" id="deckManifest">
  ...
</script>
```

This keeps speaker notes available when the final HTML is opened offline. The manifest block is data, not executable JavaScript.

## Privacy and output boundaries

- Notes are not inserted into slide markup.
- Notes do not appear in the audience window.
- Notes are not rendered into slide screenshots, contact sheets, or PDF output.
- Notes are present inside the delivered single-file HTML. Do not store secrets or information that must be excluded from the distributed file.
- “Presenter-only” means hidden from the audience view, not encrypted.

## Popup behavior

Browsers may block the presenter window when popups are disabled. The runtime displays an explicit message. Allow popups for the local file or host and press `P` again.

Closing the presenter window does not affect audience playback. Reopening it reconnects to the current slide state.

## Scope

Presenter mode intentionally excludes:

- laser pointer and drawing tools
- phone remote control
- cloud synchronization
- audience interaction
- multi-presenter collaboration
- automatic transcription or teleprompter scrolling

These features require a larger state, networking, and permissions model and are outside the HTML PPT delivery contract.
