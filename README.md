# Agent Skills

Reusable agent skills maintained by `yaney01`. Each skill is self-contained in its own folder.

## Skills

- [`扩图`](./扩图/) — Use GPT Image outpainting to expand an existing image to a requested aspect ratio while preserving the original composition.
- [`ppt`](./ppt/) — Create, redesign, edit, validate, and export browser-editable, single-file HTML presentations. Optimized for Codex and directly compatible with Claude Code.

## Repository structure

```text
skill/
├── 扩图/
│   ├── SKILL.md
│   ├── agents/
│   └── scripts/
└── ppt/
    ├── SKILL.md
    ├── agents/
    ├── assets/
    ├── references/
    └── scripts/
```

New skills must be added as separate top-level folders. Files belonging to a skill must remain inside that skill's folder.

## License

MIT. See [`LICENSE`](./LICENSE). Third-party inspirations and retained notices are documented inside each skill.
