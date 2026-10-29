# Reconciliation decisions and open questions

Updated: 2026-10-23. Records differences between submitted material [S1] and baseline `e81bcb3`. These decisions reconcile documentation; they do not change application behavior.

D21 (2026-10-27): An additional text-log review found that D20 still allowed procedural detail and assumed feelings to dominate. Revise shared instructions and emotion-seeking examples: invite one event's sequence, follow actions/outcomes before meaning, and immediately leave a focus with no memory or impression, overriding the two-short-answer guideline. Allow closed clarification of uncertain speech/referents. Preserve flow, consent, analysis, model, API call count and demos. Evidence: user request/text-log review and W2, W5–W7. Add five synthetic bilingual cases and instruction-delivery tests without copying real transcripts/personal details. These are model instructions, not an enforced state machine or guarantee of long answers, live quality or reach. Audio/prompt-revision verification and comparative human evaluation remain outstanding.

D22 (2026-10-27): With user approval, consolidate accumulated prompt/style rules and replace mandatory event invitations with answer-led alternatives. Motivation: repetitive dialogue and reported ~$0.02 per response. A ~62% character reduction does not prove cost savings. Record usage/cost breakdowns/prompt provenance for new live sessions, deduplicate response IDs on client/server, persist in history and offer operator exports. Preserve model, flow, language, consent and analysis; do not present missing/transcription costs as complete billing. Evidence: request, R1/R3, W7/W8. Synthetic event/structure/persistence tests do not establish live quality, savings or invoice agreement. No invented usage for old logs/demos or extra API calls.

D23 (2026-10-27): Following the latest transcript/user feedback, replace greeting→product with project explanation→mind-map outcome→one product question. Explain the interest in the participant's preferences and values first. Allow three brief sentences/about twenty seconds only at opening; preserve subsequent brevity, one question, refusal, language, analysis and consent. Share bilingual wording between live/demo openings without changing later demo lines or old logs. Evidence: request and R1/R3/W7. Revision 2026-10-27.4. Test both styles/languages and single demo introduction; no paid API/live-quality verification or copied real transcript.

D24 (2026-10-27): User approved comparing cheaper cloud voice models. Add pre-interview operator selection (mini/standard/server configuration) and an API allowlist instead of environment-only selection. Unset uses existing defaults; explicit choice takes precedence and flows consistently into connection and usage. Preserve prompts, consent, language, voice and analysis. No automatic fallback, duplicate paid evaluation or provider migration. Evidence: authorization, R3, W9. Mock-test selection, persistence, bilingual UI, API acceptance/rejection and upstream/usage consistency. Live quality, account access to mini and actual savings unverified.

D25 (2026-10-27): User authorized reducing repeated/answered questions. Start with a local heuristic guard, no judge API: completed-question matches/repeated angles trigger up to two context notes with short recent-answer excerpts. Not complete semantic answered-state detection or forced question blocking. No extra generation, interruption or flow/consent change; disclose input-token overhead and false positives. Evidence: request, R3, W10. Synthetic tests cover completion/refusal/repeat requests/exclusion/limits/languages/events, not live naturalness/cost/effectiveness. Explain local-AI cost possibilities without downloading/installing models.

## Reconciliation

| ID | Submitted claim | Treatment and reason | Evidence |
| --- | --- | --- | --- |
| D01 | About ten minutes, three phases | Duration agrees; use the current four phases, not three as the implementation specification | R1, R3 |
| D02 | Five or six categories; extract 10% of words | Preserve as method background. Current map has five fixed categories with four terms each, no 10% rule | R4 |
| D03 | At least three, at most six “why” questions | No mandatory quota. Three to six steps are guidance; participant choice comes first | R1 |
| D04 | Examples leading to mother, daughter and family | Only follow participant disclosures. Daughter question precedes disclosure; do not reuse as a real transcript | S1 section 5, R1 |
| D05 | “It moisturizes and helps you relax” | Adds unexpressed sensation/emotion; do not transfer into instructions | S1 appendix A, R1 |
| D06 | Story coherence and probing establish causation | Only candidate links with explicit participant reasons and unique endpoints | R4 |
| D07 | Summary answer or approval establishes highest value | Require explicit greatest-importance wording and uniqueness; general agreement is separate | R4 |
| D08 | Whether C removes voice is undecided | Current C permits voice with face cut out. Do not expand old signed permissions | R6 |
| D09 | Noncosmetic branch, minors, exclusion UI and layout switching undecided | Current policy/features exist. Separate their presence from unverified quality | R1, R5, R6, R7 |
| D10 | Build fact/interpretation/emotion classifier | Adopt the distinction as a principle; do not describe that engine as implemented in the current voice flow | S1, R4 |
| D11 | Return to the main topic after digression | Daily life and experiences fit the purpose. Do not force a return to products | R1 |
| D12 | Strong source recommendations and named authors/companies | Source identifiers, URLs, pages and citation IDs absent. Treat as a received secondary summary, not independently verified support | S1 |
| D13 | Old eight-question/five-stage specification and unimplemented lists | Preserve as old-engine history and add a pointer to current `/live` knowledge | Old requirements/design/testing, R2 |

## Unresolved or unverified

D20 (2026-10-27): Implement the user-approved research direction. Replace formulaic acknowledgment, abstract interpretation and weak recovery with explicit instructions to accept practical answers, avoid equating acknowledgments with agreement, change focus after two short answers, and change the next question after dissatisfaction/correction. Preserve one question, approximate ten minutes, refusal/stopping, non-leading practice, five map categories and publication terms. Separate public editing from recording; add word-based clip ideas, question markers and JSON only in operator history. Preserve original wording, negations, context and exclusions; no virality prediction, automatic publishing or cutting. Evidence: this request, R1/R3 and sources W1–W4. Six bilingual synthetic cases and structural tests validate instruction delivery and local processing, not live voice or posting outcomes. Do not copy actual logs/personal information into evaluation assets; no paid APIs or platform connection. See production workflow and quality evaluation.

D19 navigation follow-up (2026-10-26): The supplied screenshot showed only a generic analysis/media link, hiding the participant-report entry point. Add a prominent dedicated button and detail anchor, navigating after IndexedDB loading. Signing and PDF logic are unchanged. Add regression assertions for bilingual buttons, anchor and post-load scrolling.

D19 (2026-10-26): Implement the requested participant analysis PDF, final signing and signature history. Previously analysis exports and consent receipts were separate, without archive signing. Reuse existing publication-consent forms/terms; combine analysis and the original receipt only after a signature linked to the interview is saved. Preserve older signatures and issued PDFs; show errors/retries for failed history saves. Abort issuance if source dialogue or signature changes during generation. Exclude new private fields from raw JSON exports. This is local handover, not automatic report email delivery, identity verification or a legal-validity guarantee. Evidence: this user request and existing consent/PDF implementation. Render bilingual synthetic sample PDFs; unit tests cover matching signatures, all receipt pages, previous records, history persistence and private-field exclusion. No real signing, email or reading actual browser history.

D18 (2026-10-26): Implement the user's request for per-conversation summaries and JSON downloads. Previously exports were nested in the media tab; add direct buttons on lists and details. Label non-excluded guest excerpts explicitly to avoid costs and invented interpretation. Whitelist JSON fields, omitting excluded speech, pre-correction text, signatures, preparation metadata and media. Users must inspect personal details within dialogue. Existing raw exports, consent and interview design remain unchanged. Evidence: this user request and archive implementation. Test exclusions, private data, times, filenames, empty entries and UI placement; do not read real browser history or call live APIs. D15–D17 are used by separate PRs and are not reused.

| Priority | Item | Known state / next decision |
| --- | --- | --- |
| High | Original sources | NotebookLM source titles, URLs/IDs, pages and citation mapping not received. Especially verify 10%, three-to-six repetitions and the original dialogue image |
| High | Spoken stop request | Buttons and expiry exist. Requirements, detection and exceptions for reliable speech-triggered stopping remain unsettled. Distinguish topic refusal from ending the whole interview |
| High | Early ending and deletion | Ending passes existing text to review and saves history where possible. Do not interpret ending as consent to delete everything; define retention/discard operations |
| High | Contradictions and corrections | Do not silently prefer old or new text. Decide how context, correction intent and exclusions persist |
| High | Live-voice quality | Evaluation framework proposed. Cases, reviewers, thresholds, retries and actual review remain incomplete |
| Medium | Silence and short answers | Waiting policy exists; seconds, retry counts and ending thresholds are unset |
| Medium | Extraction accuracy | Fixed dictionaries/regular expressions have language, negation, irony and grammar limits. Define improvement scope and evaluation data |
| Medium | Publication, storage and consent operations | Refer to current terms. Add no blanket waiver; resolve expert review, identity verification and retention operations |
| Medium | Devices, synchronization and delivery | Verify iPad, external microphone/camera and actual email delivery |

## Scope of the original consolidation

Preserved the submitted material; reconciled current behavior; created a playbook, evaluation proposal, unresolved-items register and source register; linked older documents. No prompt, analysis algorithm, consent text or screen behavior was changed. Do not fill source gaps with guesses or call future features delivered.

## Bilingual maintenance decision: 2026-10-23

D14: Japanese files at the knowledge root are the editorial source; `en/` maintains corresponding English translations with the same evidence categories and decision IDs. Original received material remains unchanged in the shared source archive. Maintain both languages in one PR and follow the [development workflow](development-workflow.md). Existing user authorization remains valid; routine implementation inside the documented baseline does not require renewed approval. No app behavior changes are introduced by translation.

[日本語](../decisions-and-open-questions.md)
