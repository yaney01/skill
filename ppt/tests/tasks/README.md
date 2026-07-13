# Task regression cases

`cases.json` is the deterministic task-level acceptance registry for the HTML PPT Skill. It defines complete production jobs rather than isolated unit-test fixtures.

Each case declares:

- task ID, language, density, and theme
- optional source fixture and conversion policy
- deck-level visual strategy
- final slide map using registered layouts
- per-slide visual decision
- complete source-to-slide mapping when applicable
- measurable expectations for slide count, layout variety, source coverage, offline behavior, bundling, and contact sheets

Validate the registry:

```bash
npm run tasks:validate
```

Run contract-only CI coverage:

```bash
npm run tasks:run
```

Run full rendered QA:

```bash
npm run tasks:qa
```

The runner writes generated projects under `qa/task-regression/`. Do not manually edit generated task outputs as the source of truth; update `cases.json`, the relevant theme/layout implementation, or the runner.

See [`../../references/task-regression.md`](../../references/task-regression.md) for the complete workflow and [`manual-agent-matrix.md`](manual-agent-matrix.md) for Codex/Claude Code acceptance.
