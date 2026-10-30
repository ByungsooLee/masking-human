# Changelog

## 2026-10-30: Key limits, WebRTC playback sync and recovery (D34)

- Preflight the normal OpenRouter key's spending limit instead of account credits. Use actual installed SDK WebRTC events and response IDs to detect playback completion; keep the opening microphone muted until then. Add explicit resume without automatic retries on errors.
- Count answer rounds, group queued speech and exclude short acknowledgements from progression. Prioritize stop/refusal over progression guidance. Update bilingual docs and decisions. Account credits, paid APIs and live-device audio remain unverified.
- Validation: 74 test files, 371 passed and 13 skipped; type check, scoped ESLint and whitespace checks passed. Actual SDK event delivery was tested offline. First build stopped on the known Next.js security warning; retry succeeded. Upgrade recommendation remains open.

## 2026-10-30: One short story with an ending (D33)

- Push review baseline `afbc534`; subsequent changes add eight-answer progression, closing audio drain, opening protection and concrete-story prompts. Update bilingual specification, evaluation and decisions. No paid API/live voice evaluation.
- 73 files, 361 tests passed and 13 skipped; type, scoped ESLint and whitespace checks passed. Existing Next.js security warning requires a separate upgrade. Mock success does not establish live voice quality.

## 2026-10-30: Fresh startup sessions (D32)

- Save new sessions and selected initial consents together, removing stale-ID/browser-storage dependence. Distinguish authentication, storage and audio activation errors. No paid API calls; saved browser permissions prevented verification on the actual screen.

## 2026-10-30: External-review authentication and voice-stall fixes (D31)

- Add durable login limits, separate signing keys, logout, public origin, production storage opt-in and corrected admin authentication routing.
- Test empty-transcription recovery, between-sentence interruption, final untranscribed intervals and reply 404 fallback. Update bilingual specification, configuration and remaining limitations. No paid API calls.
- Validation: 71 files, 349 tests passed and 13 skipped; type, scoped ESLint and whitespace checks passed. Isolated PGlite verified migration 007 per-sender/global caps, expiry and anon denial; not applied to production. Build initially stopped on the existing Next.js security warning and succeeded on retry. Upgrade remains recommended.

## 2026-10-30: Explicit login feedback (D28)

- Show status in the collapsed heading, with distinct success/failure/loading feedback and the next action. Verify authenticated access, prevent duplicate submission, add timeouts and Enter submission. Test bilingual states/errors.

## 2026-10-30: Low-cost voice and always-visible spending (D26)

- Add optional OpenRouter STT/fixed LLM/one backup/fixed voice TTS. Connect shared microphone/timing, interruption and sentence prefetch to existing recording.
- Add cost breakdowns, monthly reservations, unresolved holds, history/JSON, operator API access and shared Supabase accounting. Remove legacy text generation from initial consent storage.
- Update bilingual setup/spec/decisions/evaluation. No live voice/Supabase/paid API/invoice validation. Realtime stays the default.
- Validation: 70 files, 332 tests passed and 13 skipped. Type check, changed-scope ESLint, whitespace and documentation links passed. PGlite checked SQL reserve/settlement, revisions and anonymous denial. Local `/live` returned HTTP 200 with the selector; anonymous API returned 401. Existing Next.js stopped one build with SecurityFatalError; retry exited 0, with the upgrade warning remaining. Distinguish these from browser interaction/live voice.

## 2026-10-27: Dialogue guard without another AI call (D25)

- Validation: 65 files/312 tests passed, 13 skipped. Type check, changed-file ESLint and diff whitespace passed. Twelve synthetic guard cases. No live voice, browser interaction or paid model calls.

- Locally flag repeated completed questions/angles; append a short operator note with recent answers. Two notes/session with four-completed-reply cooldown. Skip incomplete/cancelled, excluded, refused/stopped/repeat-request cases.
- No regeneration/interruption/judge API. Disclose input-token overhead, false positives/misses and post-generation limitations. Store sent reason/ID/time in usage history/JSON, not note text/excerpts. Demo, consent and flow unchanged.
- Update bilingual spec/decisions/evaluation/workflow/sources and add synthetic unit cases. No local AI installation or paid calls; live effects unverified.

## 2026-10-27: Mini/standard model comparison (D24)

- Validation: 64 files/300 tests passed, 13 skipped. Type check, changed-file ESLint, diff whitespace and relative knowledge links passed. Upstream API stubbed; bilingual selector statically rendered. No browser interaction or paid voice calls.

- Add persistent operator selection in preparation: mini, standard or server configuration. Unset/legacy settings preserve defaults; API rejects unknown models with 400; disable choices in demos.
- Propagate selection consistently through upstream session/client connection/usage records. Compare using existing history/JSON. No automatic fallback or duplicate API evaluation. Language, instructions, voice, consent and analysis unchanged.
- Update bilingual UI/specification/evaluation/decisions/sources/comparison workflow. Live quality, availability and savings unverified. No paid API calls.

## 2026-10-27: Explain the project before the first question (D23)

- Validation: 63 files/293 tests passed, 13 skipped. Type checking, changed-module/test ESLint and diff whitespace checks passed. Live voice and browser interaction not performed.

- Shared bilingual introduction: purpose→mind-map outcome→one question. Allow three brief sentences/about twenty seconds only at opening. Preserve later one-question behavior, language adaptation, consent and model.
- Deliver the same opening rules to both styles and align first demo lines. Revision 2026-10-27.4; old logs and subsequent demo dialogue unchanged.
- Update bilingual specification, decisions, playbook and evaluation; add delivery/demo-opening regressions. Live voice and reduced boredom unverified. No paid API calls.

## 2026-10-27: Compact instructions and response usage (D22)

- Validation: 63 files and 289 tests passed, 13 skipped; type check, diff whitespace and relative knowledge links passed. Changed-code ESLint had no errors (two existing unused-variable warnings in the usage PATCH route). History UI verified by bilingual static rendering, not browser interaction, live voice or paid API calls.

- Shared instructions: 6,538→2,497 characters (~62% less), with shorter styles. Follow guest-led relationships, choices, changes or events rather than mandatory scenes. Model, consent, analysis and demos unchanged.
- Record response ID/status/time, token/cost buckets and prompt hash/revision/characters. Deduplicate IDs client/server, preserve ledger on archive resaves, add bilingual history UI/JSON/editing ZIP export. No conversation text, API keys or signatures in usage records, and no participant UI/PDF addition.
- Exclude transcription charges and missing events explicitly. Old entries/demos show missing usage. No paid API, invoice reconciliation, live voice or actual savings verification.

## 2026-10-27: Invitations to tell an event (D21)

- Replace procedural/sensory probing with an event's sequence, action and outcome. No memory immediately ends that focus; clarify uncertain referents. Replace older emotion-seeking examples.
- Update bilingual specification, playbook, evaluation, decisions, sources and workflow. Add five synthetic bilingual cases and instruction-delivery regressions. No real transcript/personal-data storage, paid API, UI, consent, analysis, model or demo changes.
- String tests do not establish generated conversation quality. Live voice, comparative evaluation and post performance remain unverified.
- Validation: all 62 files passed, 280 tests passed and 13 skipped. Type checking, new-test ESLint and diff whitespace checks passed. No paid API calls.

## 2026-10-27: Conversation recovery and post-recording editing ideas

- D20: Added concrete shared instructions for absent feelings, vague acknowledgments, short answers, dissatisfaction and corrections; aligned both styles. Preserve one question, approximate ten minutes, language, refusal and stopping; avoid character judgments and performance demands.
- Only archive editing tools gain up to five exact-quote clip ideas with neighboring speech/estimated intervals, question markers and manual recovery review, plus JSON export. Include `editorial-review.json` in editing ZIPs. No extra APIs, automatic posting, platform connection or virality prediction.
- Updated bilingual specification, playbook, evaluation, decision, sources and production workflow. Added six synthetic bilingual cases without copying participant logs/personal details.
- Tests cover instruction delivery to new sessions and local processing, not model-generated replay, paid APIs, actual live voice or posting results. Existing logs and scripted demos remain unchanged.
- Validation: all 61 test files passed, 276 tests passed and 13 skipped. Type check, changed-code ESLint, `git diff --check` and relative knowledge links passed. Fifteen new regression tests. Actual UI interaction remains unverified due to browser permissions.

## 2026-10-26: Participant PDF and signature history

- Discoverability fix: add a dedicated “Participant report & signature” archive button, scrolling directly to the signing/PDF section. Updated bilingual navigation and regression tests.

- D19: Added archive signing and, after signature save, a combined analysis/extractive-summary/reference-counts PDF with all original receipt pages, using `pdf-lib`.
- Retain earlier signatures for the same interview, showing signature images, timestamps, scope, original terms and receipts. Preserve issued PDF snapshots and show counts on archive lists.
- Distinguish server consent save from local history save, with retries for local failures. Download only after PDF history save; detect changed dialogue/signature during generation.
- Exclude new private fields from JSON. Disable real signing/issuance on dedicated demos. No automatic report email or cloud sync. Existing interview, analysis and consent terms unchanged.
- Validation: all 60 test files passed, 261 tests passed and 13 skipped. Type check, changed-code ESLint and diff checks passed. Synthetic Japanese/English PDFs each have three pages; rendered charts, text, signature images and original receipt placement checked. Actual browser signing and real-device storage-exhaustion checks remain unperformed.
- Generated and rendered bilingual synthetic PDFs. No actual history, real signing, paid APIs or real email. No actual browser operations bypassing denied permissions.

## 2026-10-26: Per-conversation excerpts and JSON downloads

- Added timestamps, IDs, counts, guest excerpts and direct JSON download buttons on archive lists/details (D18), without API calls or charges.
- New JSON excludes removed speech, pre-correction text, signatures, preparation metadata, audio and raw events. Existing raw editing exports remain available.
- Updated bilingual UI, specification and decision record. Interview, analysis and consent terms remain unchanged.
- Results: all 59 test files passed, 255 tests passed and 13 skipped. Type check, ESLint on changed code and `git diff --check` passed; seven new conversation JSON tests.
- Unit tests cover excerpts, ordering, times, private metadata exclusion, filenames, empty entries and UI placement. No actual history, recordings or paid APIs used. No browser verification bypassing denied access permissions.

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
