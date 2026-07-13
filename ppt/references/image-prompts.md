# Image prompt contract

Generated images are embedded assets, not pre-rendered slides. They must not contain presentation chrome or text that belongs in HTML.

## Prompt fields

Every generated-image request should specify:

1. visual type and narrative role
2. subject and required objects
3. composition and camera direction
4. exact target ratio
5. palette and material language
6. focal position and required negative space
7. relationship to the slide claim
8. exclusions

## Base prompt structure

```text
[visual type] for a presentation slide about [claim].
Subject: [objects / people / environment].
Composition: [wide / portrait / close-up / diagrammatic], focal point at [position], leave clean negative space on [side].
Aspect ratio: [16:10].
Palette: [theme colors].
Visual function: [evidence / explanation / context / comparison].
No text, letters, numbers, logos, watermarks, UI labels, page numbers, borders, slide chrome, captions, or decorative presentation frames.
```

## Rules

- Match the final `data-image-slot` ratio before generation.
- Keep titles, subtitles, captions, page numbers, logos, and badges out of the image.
- Do not draw a fake slide inside the image.
- Do not generate critical product UI text when the real screenshot must remain legible.
- For diagrams requiring exact labels, generate or draw the structure in HTML/SVG and add text in HTML.
- For comparisons, keep camera angle, scale, and lighting comparable across both states.
- For product scenes, preserve the product form and brand constraints supplied by the user.
- Avoid repeating the same scene, metaphor, or character across multiple slides unless it is a deliberate narrative device.

## Generated asset record

Record the final decision in `deck.json`:

```json
{
  "type": "editorial-illustration",
  "required": true,
  "status": "ready",
  "source": "generated",
  "role": "context",
  "slot": "21:9",
  "path": "images/slide-01.webp",
  "alt": "设计师与 AI 协作完成广告素材生产的编辑式场景",
  "focus": "right-center"
}
```

## Review before insertion

Reject or regenerate an asset when it contains:

- unintended text or pseudo-text
- logos, watermarks, or signatures
- embedded title areas that duplicate the HTML slide
- wrong ratio or unusable focal position
- visual details that contradict the slide claim
- repeated artifacts, malformed objects, or inconsistent product geometry
- compression, noise, or insufficient resolution for the displayed size
