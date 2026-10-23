# Changelog

## 2026-10-23: bilingual documentation and development rules

- Added maintained English counterparts for the index, specification, playbook, evaluation proposal, decisions, source register and changelog.
- Added a bilingual development workflow and required-reading instructions in root `AGENTS.md`, outside the Next.js-managed block.
- Added a PR template to record documents read, behavioral impact, bilingual updates and validation.
- Japanese is the editorial source; English is the maintained translation. Preserve original source material and decision IDs; distinguish implementation, instructions, proposals and unresolved items.
- No application code, executable prompt or consent condition changed.

Validation: local relative links resolve; Japanese/English document pairs, decision IDs D01–D14 and evidence IDs S1/R1–R9 match; source archive hash remains unchanged; `git diff --check` passes. These are documentation checks, not proof that every future developer read the files or that translations are semantically checked by CI. Full CI tests/build are reported on the PR.

## 2026-10-23: initial consolidation

- Preserved the original NotebookLM export.
- Reconciled against `e81bcb3`; added current specification, interview playbook, proposed quality framework, decisions/open questions and source register.
- Documented five fixed categories, four phases, explicit participant reasons/greatest importance and current Option C voice conditions.
- Corrected invented feelings, leading family examples and mandatory questioning quotas in the playbook.
- Linked the new entry point from README, handoff and older specifications.
- No application code, executable prompt or consent condition changed.

Validation on 2026-10-23:

- Six related test files and 38 tests passed (instructions, map, findings, final analysis, demo script and consent), with `OPENAI_LIVE_TEST=0 SUPABASE_INTEGRATION_TEST=0`. No paid API or real email execution.
- Relative file links resolved.
- Archived source matched the attachment byte for byte. SHA-256: `7f32b08fe751142d16b43d75f71adb85b8c44ec3e5752723bcf85c008649fb95`.
- `git diff --check` passed.
- Live-voice, device, delivery and legal review were outside this documentation change.

[日本語](../CHANGELOG.md)
