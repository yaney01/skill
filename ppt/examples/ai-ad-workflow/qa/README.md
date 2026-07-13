# QA record

This example was exercised as a real regression deck rather than reviewed only as source code.

## Dependency-free checks

- Development HTML structural validation: passed
- Single-file bundling: passed
- Bundled HTML structural validation: passed
- Bundler result: 1 stylesheet, 2 scripts, and 2 local SVG references inlined

## Browser checks

Rendered at 1920×1080 with reduced motion enabled:

- 12 slides rendered
- 0 slide overflow errors
- 0 text out-of-bounds errors
- 0 broken images
- 0 browser console errors
- Right Arrow moved from `slide-01` to `slide-02`
- `E` activated browser edit mode

The generated PNG screenshots are intentionally not committed. Run the command in the parent README to recreate them locally.
