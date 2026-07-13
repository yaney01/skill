# Phase 6.1 source integration verification

Verified on GitHub Actions against the pull-request merge state on 2026-07-13.

## Purpose

Phase six implemented standardized source ingestion, but the main Skill and project generator did not yet make that ingestion path mandatory. Phase 6.1 closes that integration gap.

## Delivered integration

`create-deck.mjs` now supports:

- `--source <file>`
- `--preserve-layout`
- `--allow-omit`
- `--strict-source`

The generator performs ingestion and validation in a temporary directory before creating the project. Failed source preflight does not leave a partial project directory.

A successful source-aware project contains:

```text
project/
├── index.html
├── deck.json
├── README.md
├── source/
├── images/
├── runtime/
└── theme/       # when selected
```

`deck.json` receives a source contract:

```json
{
  "source": {
    "manifest": "source/manifest.json",
    "originalFile": "source.pptx",
    "type": "pptx",
    "mode": "semantic",
    "mapping": []
  }
}
```

## Source mapping contract

The production schema now registers auditable treatments:

- `preserve`
- `split`
- `merge`
- `condense`
- `omit`
- `redraw-chart`
- `retain-pixel-faithful`

Every mapping includes source IDs, final slide IDs, treatment, and reason. Omitted material must have a reason and no final slide ID; non-omitted material must map to at least one final slide.

## Main Skill integration

The primary `SKILL.md` workflow now requires source standardization for PPTX, PDF, DOCX, and Markdown conversion. It documents:

- integrated and manual ingestion commands
- semantic versus layout-preserving modes
- source-warning review
- source-to-slide mapping before full production
- source validation as a separate QA layer
- progressive loading of `source-ingestion.md` and `source.schema.json`

The repository README and generated project README expose the same workflow for Codex and Claude Code.

## Automated result

- `create-deck.mjs` syntax: passed
- source integration test syntax: passed
- deck schema JSON validation: passed
- source schema JSON validation: passed
- source-ingestion and source-integration tests: 12 of 12 passed
- source-aware Markdown project creation: passed
- source-aware PPTX preserve-layout project creation: passed
- standardized source copied into the generated project: passed
- generated `deck.json.source` contract: passed
- source-policy flag validation: passed
- conflicting source policy rejection: passed
- failed source preflight leaves no partial project: passed
- complete core regression suite: passed
- complete browser regression suite: passed
- existing 12-page Chinese example validation: passed
- production manifest validation: passed
- semantic visual QA: passed
- single-file bundling and bundled validation: passed

## Scope

The implementation does not add native PPTX output, new themes, new layouts, presenter mode, or editor features. Permanent changes remain under `ppt/`. The temporary GitHub Actions workflow was removed after verification, and the existing `扩图/` Skill was not modified.
