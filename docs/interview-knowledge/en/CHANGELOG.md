# Changelog

## 2026-10-26: Update the existing security PR

- Updated Next.js and `eslint-config-next` from 16.4.2 to the new CLI-selected 16.4.3 target within PR #6. Added bilingual D15 follow-up, preserving earlier records.
- Retained `experimental.agentUpgrade: "security"` and existing configuration. No changes to interview, analysis, consent or executable prompts. Used a separate worktree without changing main or its running development server.
- Validation: dependencies installed; `next --version` reports 16.4.3. All 58 test files passed, 248 tests passed and 13 skipped. Demo production build, type check and config ESLint passed.
- Three Playwright checks passed against the production demo on a separate port: all APIs rejected, Japanese/English flow, mobile view switching, history, ZIP/SRT/CSV/audio downloads, reload persistence and preview-only photography permission. No real microphone or external API requests.
- `npm audit`: two moderate findings (`vitest`, `@vitest/mocker`), zero high/critical findings, none for Next.js itself. No unrelated dependency remediation.
- Live API audio, iPad/external microphones and actual email delivery remain unverified. Mock success does not establish those behaviors.

## 2026-10-23: Next.js security upgrade

- Updated Next.js 16.4.0 to the CLI-selected 16.4.2 security target. No codemod for this same-major update; aligned `eslint-config-next` to 16.4.2.
- Explicitly set `experimental.agentUpgrade: "security"`, preserving existing configuration, conversation, analysis, consent and executable prompts. Added bilingual decision D15.
- Checked local/remote branches/history and GitHub open PRs; no equivalent upgrade found. Used a separate worktree.
- Validation: dependencies installed; `next --version` reports 16.4.2; 58 files passed, 248 tests passed and 13 skipped with live APIs disabled. `build:demo`, `tsc --noEmit` and ESLint on the config passed.
- Three browser E2E tests passed against the 16.4.2 production demo, covering Japanese/English flow, mobile views, history, downloads and API rejection. `/live?mock=1` returned 200 and `/api/session` returned 403.
- `npm audit` reports no finding for the Next.js package itself; seven findings remain in other development dependencies (five high, two moderate): `@next/eslint-plugin-next`, `eslint-config-next`, `fast-glob`, `micromatch`, `braces`, `vitest`, `@vitest/mocker`. No unrelated forced downgrade or blanket fix was applied.
- No live voice, paid API or real email execution. Full CI results are recorded on the upgrade PR.

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
