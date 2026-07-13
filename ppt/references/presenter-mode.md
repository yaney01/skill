# Lightweight presenter mode

The HTML PPT runtime includes a constrained presenter workflow for live talks, reviews, training, and meetings. It is not intended to reproduce every PowerPoint or Keynote presenter feature.

## Audience controls

| Key | Action |
|---|---|
| `P` | Open the presenter window |
| `Esc` | Open or close the slide overview |
| `G` | Jump to a numbered slide |
| Arrow keys / Page Up / Page Down / Space | Navigate |
| `Home` / `End` | First or last slide |

The browser may block the presenter popup. Allow pop-ups for the local file or site, then press `P` again.

## Presenter window

The presenter window contains:

- current-slide preview
- next-slide preview
- current slide number and total
- private speaker notes
- elapsed timer
- previous and next controls
- numbered slide jump
- timer reset

Presenter keyboard controls:

| Key | Action |
|---|---|
| Arrow keys / Page Up / Page Down / Space | Control the audience window |
| `Home` / `End` | First or last slide |
| `G` | Jump to a numbered slide |
| `T` | Reset the elapsed timer |

The audience and presenter windows synchronize in both directions. The presenter window sends a periodic handshake, so refreshing it reconnects to the current audience slide.

## Notes contract

Speaker notes belong in `deck.json`, not in visible HTML or long data attributes.

Legacy string notes remain valid:

```json
{
  "id": "slide-03",
  "notes": "Explain why the workflow changed."
}
```

Preferred structured notes:

```json
{
  "id": "slide-03",
  "notes": {
    "speaker": "Explain why the workflow changed and pause after the main claim.",
    "durationSeconds": 75,
    "private": true
  }
}
```

Fields:

- `speaker` — private presenter text
- `durationSeconds` — optional target duration for planning and future timing tools
- `private` — declares that the note must not appear on the audience canvas

The current lightweight runtime displays `speaker` notes and an elapsed timer. `durationSeconds` is retained as structured planning metadata.

## Development and single-file delivery

In a development project, presenter mode attempts to read adjacent `deck.json`. Some browsers restrict `fetch()` for local `file://` pages. When that happens, playback and previews still work, but notes may fall back to DOM headlines.

For reliable offline delivery, bundle the deck:

```bash
node scripts/bundle-html.mjs \
  /absolute/path/to/project/index.html \
  /absolute/path/to/dist/presentation.html
```

The bundler embeds adjacent `deck.json` as:

```html
<script type="application/json" id="htmlPptManifest">...</script>
```

This keeps notes available in a fully portable single HTML file without a server or network connection.

## Privacy and export behavior

- Speaker notes are not inserted into audience slide content.
- Presenter and overview UI are runtime-only overlays.
- Presenter UI is hidden during print and PDF export.
- Edited-HTML download removes generated presenter and overview DOM clones.
- The embedded manifest remains in the downloaded HTML so presenter notes continue to work.

The single HTML file still contains the notes data. `private: true` means hidden from the audience view, not encrypted or access-controlled. Do not distribute confidential notes inside a file that will be shared externally.

## Scope boundaries

Not included:

- laser pointer or drawing tools
- phone remote control
- cloud synchronization
- audience interaction
- multi-presenter collaboration
- teleprompter scrolling
- analytics or rehearsal reports
- video-conferencing integration

These remain outside the zero-backend, portable HTML contract.

## QA checklist

Before delivery, verify:

1. `P` opens a presenter window after pop-up permission is granted.
2. Current and next previews are correct.
3. Presenter navigation updates the audience window.
4. Audience navigation updates the presenter window.
5. Speaker notes match each `data-slide-id`.
6. Refreshing the presenter window restores the current slide.
7. `Esc` overview contains the correct number of slides.
8. `G` jumps to the requested slide.
9. Notes do not appear on the audience canvas or in PDF.
10. Bundled HTML works offline and retains notes.
11. Edited HTML contains no presenter or overview clone markup.
12. Closing the presenter window does not interrupt audience playback.
