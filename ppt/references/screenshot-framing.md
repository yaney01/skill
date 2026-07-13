# Screenshot framing

Screenshots are evidence. Preserve their content and legibility instead of regenerating them through an image model.

## Workflow

1. Inspect the original screenshot dimensions and important regions.
2. Decide whether the slide needs full fidelity, a focused crop, or multiple detail panels.
3. Select the final slot ratio before framing.
4. Create a background canvas and place the screenshot without distorting it.
5. Add margins, restrained shadow, browser/device chrome only when it improves comprehension.
6. Use HTML annotations for callouts and labels.
7. Verify text at presentation distance.

## Fit behavior

- Use `contain` for dashboards, diagrams, tables, and UI where every label matters.
- Use `cover` only when cropping is intentional and the focal point is declared.
- Add `data-focus` or an explicit `object-position` when a cover crop is required.
- Do not stretch a screenshot to fit a slot.
- Do not place a long mobile screenshot into a wide slot without splitting or reframing it.

## Standard frames

| Source | Preferred slot |
|---|---|
| desktop product UI | `16:10` |
| browser page | `16:9` or `16:10` |
| dashboard | `16:10`, usually `contain` |
| mobile UI | `9:16`, `3:4`, or a multi-device composition |
| before/after UI | two equal `4:3` or `1:1` panels |
| long page | 2–3 focused panels rather than one unreadable strip |

## HTML example

```html
<figure class="screenshot-frame" data-visual-type="product-screenshot" data-visual-role="evidence">
  <img
    src="images/slide-05-dashboard.png"
    alt="广告素材审核仪表盘，展示状态、负责人和问题分类"
    data-image-slot="16:10"
    style="object-fit:contain"
  >
</figure>
```

## Prohibited handling

- do not use ImageGen to redraw critical UI text or data
- do not crop away navigation, labels, axes, or legends required for the claim
- do not add invented metrics or fake interface states
- do not apply heavy perspective transforms that reduce legibility
- do not use a generic laptop mockup when it consumes more space than the evidence
