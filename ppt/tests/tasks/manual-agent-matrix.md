# Manual Codex and Claude Code task matrix

The automated task suite validates artifacts without invoking a language model. Use this matrix to verify that Codex and Claude Code can independently execute the same task contract.

## Run record

| Field | Codex | Claude Code |
|---|---|---|
| Date |  |  |
| Agent/model version |  |  |
| Repository commit |  |  |
| Case ID |  |  |
| Source file |  |  |
| Output directory |  |  |
| Operator notes |  |  |

## Required execution

Give both agents the same task brief, source files, target theme, density, and delivery constraints. Do not require identical HTML or identical wording.

Each result must independently satisfy:

| Contract | Codex | Claude Code | Evidence |
|---|---:|---:|---|
| Source standardized before conversion |  |  | `source/manifest.json` |
| Source warnings reviewed |  |  | notes / report |
| Source mapping complete |  |  | `deck.json.source.mapping` |
| Theme and layout registry valid |  |  | `layoutRegistry` |
| All layouts registered |  |  | strict manifest report |
| Slide count within task contract |  |  | `deck.json` |
| Visual coverage meets target |  |  | visual report |
| Evidence coverage meets target |  |  | visual report |
| No P0 semantic visual findings |  |  | `visual-report.json` |
| Mechanical QA passes |  |  | screenshots / log |
| Contact sheet reviewed |  |  | `contact-sheet.png` |
| Chinese line breaking and punctuation pass |  |  | screenshots |
| No runtime network dependency |  |  | offline check |
| Single-file bundle validates |  |  | `dist/*.html` |
| Text editing persists |  |  | browser test |
| Image replacement persists |  |  | browser test |
| Edited HTML downloads and reopens |  |  | downloaded file |

## Acceptance rule

A run passes when both agents satisfy the same production contracts, even when their narrative wording, CSS details, or visual composition differ.

A run fails when either agent:

- bypasses source standardization
- silently drops source material
- invents an unregistered layout
- marks missing visuals ready
- depends on remote runtime assets
- passes only structural QA while failing semantic visual quality
- cannot reopen the bundled or edited HTML

Record failures as implementation or instruction defects. Do not weaken the shared contract to make agents appear equivalent.
