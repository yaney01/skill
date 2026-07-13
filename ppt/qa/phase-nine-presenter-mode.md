# Phase nine presenter mode verification

Verified on GitHub Actions on 2026-07-13.

- Workflow run: `29267325457`
- Job: `86875989364`
- Result: passed

## Delivered runtime

The fixed-stage HTML runtime now includes a lightweight presenter mode:

- `P` opens a separate presenter window
- current-slide preview
- next-slide preview
- current page and total page count
- speaker notes from `deck.json`
- elapsed timer with reset
- previous, next, and go-to-slide controls
- bidirectional audience/presenter synchronization
- `Esc` slide overview
- `G` slide-number jump
- explicit popup-blocked feedback

The implementation remains dependency-free in delivered HTML and does not add a backend, account system, cloud synchronization, or collaboration layer.

## Notes and bundling

Speaker notes remain structured production data in `deck.json`; they are not inserted into audience slide markup.

`bundle-html.mjs` embeds the sibling production manifest into the final single-file HTML as an inert JSON block:

```html
<script type="application/json" id="deckManifest">
  ...
</script>
```

This preserves notes in offline delivery without adding a `deck.json` runtime dependency. Notes are not rendered into slide screenshots, contact sheets, or PDF pages. Because the manifest is included in the distributed HTML, notes must not contain secrets.

## Preview isolation

Presenter preview iframes initialize the normal fixed-stage player so their `#slide-N` hashes render correctly. The query parameter `htmlppt-presenter-preview` disables presenter channels and presenter-only shortcuts inside the preview frames, preventing recursive presenter windows and synchronization loops.

## Automated presenter regression

The Playwright presenter fixture verifies:

- bundled HTML contains `deckManifest`
- bundled HTML does not reference an external `deck.json`
- `P` opens the presenter popup
- initial page position and speaker notes are correct
- presenter Next updates the audience window
- audience ArrowRight updates the presenter window
- current notes follow the synchronized page
- `Esc` opens and closes the overview
- `G` accepts a page number and jumps
- preview frames load the requested slide

## Complete regression

The final workflow also passed:

- runtime, bundler, presenter-test, package, and schema syntax checks
- presenter-specific browser regression
- complete existing core regression
- runtime, editor, and semantic visual browser regression
- all task contracts
- all 10 rendered task pipelines and 52 task slides
- source-backed Markdown, PPTX, DOCX, and PDF cases
- data-heavy, long-CJK-title, and offline cases
- existing 12-page Chinese production example
- single-file bundling and bundled-output validation
- bundled production-example manifest presence

## Scope

This phase does not add laser pointers, drawing tools, phone remote control, audience interaction, cloud synchronization, teleprompter scrolling, native PPTX output, themes, or editor enhancements. The existing `扩图/` Skill is unchanged.
