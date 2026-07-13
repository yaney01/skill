# Credits and provenance

This skill is an original cross-agent implementation assembled for `yaney01/skill`.

## Directly reusable MIT reference

- [`zarazhangrui/frontend-slides`](https://github.com/zarazhangrui/frontend-slides), also studied through the user's fork [`yaney01/frontend-slides`](https://github.com/yaney01/frontend-slides).
- The fixed 1920×1080 stage model, single-file delivery approach, visual style discovery concept, and lightweight browser editing model informed this implementation.
- `assets/runtime/viewport-base.css` retains the same fixed-stage architecture and was adapted under the MIT license.

## Architectural reference

- [`hugohe3/ppt-master`](https://github.com/hugohe3/ppt-master), also studied through [`yaney01/ppt-master`](https://github.com/yaney01/ppt-master).
- Its separation of content strategy, design specification, layout systems, generation, and QA informed the directory and workflow design. Native PPTX/SVG/DrawingML code is not included.

## Clean-room design reference

- [`op7418/guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill), also studied through [`yaney01/guizang-ppt-skill`](https://github.com/yaney01/guizang-ppt-skill).
- It inspired Chinese typography discipline, image-slot ratios, editorial/Swiss visual territories, light/dark layout rhythm, and checklist-driven QA.
- `assets/themes/shared/cjk.css` independently implements the corresponding Chinese font roles, title/body tracking, line-height, strict line breaking, punctuation containment, mixed-script spacing support, and no-wrap utilities.
- `assets/themes/guizang-magazine/` and `assets/themes/guizang-swiss/` are optional clean-room backup themes written specifically for this repository.
- No AGPL source code, templates, scripts, WebGL shaders, or assets are copied into this MIT-licensed skill. Theme markup and CSS were independently written from public design descriptions and general presentation-design principles.
