# Current specification and implementation locations

Updated: 2026-10-23. See the [index](README.md) for evidence categories and the [source register](sources/README.md) for source IDs.

## Purpose and success conditions

Help participants describe concrete experiences and things that matter to them, starting with everyday habits and staying within what they want to share. Depth, family stories, tears and discovering values are not required outcomes. “Nothing in particular” and “I don't know yet” are valid results. [S1, R1]

## Participant experience: current implementation

D33: Adopt [one short story with a visible ending](production-conversations.md). Aim for six to eight questions; close after eight nonempty guest answers, then review after playback. Protect opening AI input and add progression to both engines. Preserve the ten-minute ceiling, single questions, non-leading behavior and consent. Live voice improvement remains unverified.

D32: Create a fresh session and save selected initial consents together on each start. Do not reuse old sessionStorage credentials. Distinguish authentication, storage and audio activation failures. Publication/signature consent conditions remain unchanged.

D31: Harden low-cost authentication, empty-transcription recovery and untranscribed interval warnings. See [review hardening](low-cost-voice.md#review-hardening-d31-supersedes-older-details-below) for production configuration, migration 007 and remaining limitations. Prompts and consent conditions are unchanged.

D30: Check OpenRouter balance before recording and on connection. Distinguish insufficient credits, key limits and failed balance checks from generic AI errors, explaining an unfunded account before recording starts.

D29: Validate Origin against the browser-facing Host and protocol, avoiding false rejection caused by Next's internal localhost rewrite. Do not permit cross-site or different-port submissions.

D28 (2026-10-30): Operator login displays checking/signed-out/signing-in/signed-in states in the collapsible heading. Verify the cookie with an authenticated request; show a green success panel and next step. Distinguish incorrect password, cookie failure and connection failure in both languages.

D26 (2026-10-30): Preparation can select the [low-cost engine](low-cost-voice.md): OpenRouter STT → fixed text LLM → TTS. Existing Realtime stays the initial default. Preserve one-question/language/refusal/review/final-release rules and recording timing. Always show session/month OpenRouter costs, breakdowns and $1/80%/100% thresholds during conversation; retain them in history and usage JSON. Distinguish reported/estimated/unresolved amounts. Reserve against a default $10 monthly budget using shared Supabase or persistent local files with deduplication/concurrency protection. Configured operator access gates APIs. A dedicated initial-consent API replaces the legacy text engine's question-generation call. Preparation explains transmission to OpenRouter/providers. Live voice, actual costs and synchronization remain unverified; the new engine is not automatically promoted.

2026-10-27 (D20): Preserve one question, four phases and participant choice, while avoiding full repetition and unconfirmed character judgments and following concrete scenes. Accept absent emotions, do not treat vague acknowledgments as agreement, and change the next question after two short answers, dissatisfaction or correction. Stopping takes priority; do not demand virality, tears or quotable lines. These are model instructions, not execution guarantees, applied to new live sessions only. Old logs and scripted demos remain unchanged.

Preparation → synchronization cue → conversation and recording → transcript correction and exclusion → participant review of analysis candidates → final analysis and publication signature. Video and social-media exports are in archive details. `/` and `/voice` lead to `/live`. [R2, R5]

| Item | Current treatment | Evidence |
| --- | --- | --- |
| Live voice | About 10 minutes. AI starts after connection; closing instructions at 9 minutes; expiry at 10 minutes starts ending the session | R1, R3 |
| Conversation phases | 0–1 minute: opening; 1–3: bridge to everyday life; 3–8: explore experiences; 8–10: articulation and closing. These are design guidelines | R1 |
| Question count | The old engine's eight-question cap does not apply to current voice conversations. Normally use a brief acknowledgment and one question with one focus | R1, R3 |
| Follow-up depth | Explore one or two memorable experiences through roughly three to six steps. Do not prioritize a quota or repeated “why” questions | R1 |
| Interviewer | Choose default / reflective, age presentation and gender expression in preparation | R1, R3 |
| Language | Japanese and English UI. English mode instructs the model to adapt the conversation language from the first substantive answer; Japanese mode does not automatically switch from the opening utterance | R3 |
| Ending | Live mode proceeds to review through the end button or time limit. A spoken “I want to stop” is not verified to trigger immediate programmatic stopping reliably | R3, R5 |
| Demo | `npm run dev:demo`: all APIs blocked, real capture and signature saving disabled. Uses a script and synthetic audio; does not evaluate actual generated conversation quality | R8 |

### D21: Narrative entry and focus exit (2026-10-27)

The shared prompt moves from seeking special feelings to inviting one event's sequence → participant action → outcome → their interpretation. No remembered/impressive episode immediately ends that focus, without waiting for D20's two short answers. Closed clarification is allowed for ambiguous referents; do not add activities or feelings. Preserve approximate ten minutes, four phases, one question, language, refusal/stopping, five analysis categories and consent. These are instructions for new live sessions, not an enforced state machine or verified live-voice improvement. See [conversation workflow](production-conversations.md).

D22 (2026-10-27): Shorten the shared prompt by about 62%; select relationships, choices, changes or events based on the answer, not mandatory scene requests or product returns. New live sessions archive per-response usage, cost breakdowns, model and prompt revision/hash/characters, available in history and JSON. Deduplicate response IDs. Estimates exclude transcription charges and missing events; old entries have no recorded usage. Participant UI/PDF, consent and model remain unchanged. Actual savings and quality are unverified. See [D22](production-conversations.md).

D23 (2026-10-27): Start with project purpose → mind-map outcome → one cosmetics/skincare question instead of jumping from greeting to product. Inject the selected Japanese/English opening into session instructions. Only the opening may use three brief sentences/about twenty seconds; do not repeat the introduction and wait for the answer. Preserve subsequent one-question/two-sentence guidance, language adaptation, consent, analysis, model and ten-minute limit. Update only the first demo line in both languages, not later script or old logs. Prompt revision: 2026-10-27.4; shared wording: `src/lib/realtime/interview-opening.ts`. Live delivery is unverified.

D24 (2026-10-27): A collapsed “Operator settings · model comparison” section in preparation offers server configuration (unchanged), `gpt-realtime-2.1-mini` and `gpt-realtime-2.1`. Send explicit selection at start and use the same model for API configuration, client connection and usage records. Unset selection preserves environment/default behavior. Persist the choice with preparation settings; support legacy settings and reject unknown client models with HTTP 400. No in-conversation switching or automatic expensive fallback. Bilingual UI; demo selection disabled and not a real model comparison. Compare actual model/cost manually in history/JSON. Prompt, language, voice, consent and analysis unchanged; live quality and savings unverified.

D25 (2026-10-27): Add local repetition detection to live interviews. From the last four completed AI replies, flag repeated questions or three repeated angles; append a brief operator note with recent participant excerpts. This is heuristic, not semantic answered-state tracking or psychology, and may misfire. Do not guide on incomplete/cancelled replies or recent refusal/stopping/repeat requests. At most twice per session, at least four completed replies apart. No extra generation, regeneration or automatic interruption; notes may add input tokens. Record sent counts in history/JSON. Live depth/quality unverified; demos unchanged. No local LLM installation; cloud voice charges remain.

## Analysis and participant review: current implementation

Only nonempty, nonexcluded guest utterances are analyzed. AI and host words are not participant facts. Analysis runs locally without additional AI calls. [R4]

- The central theme is “Personal values explored through cosmetics.” Five fixed categories: triggers and concerns; experiences and memories; current habits and feelings; future and passing on; core values.
- At most four terms per category, twenty displayed nodes in total. Identical text is merged into one node; different spellings are not merged as synonyms.
- Nodes contain phrases present in the source text. Dictionary and simple-rule extraction produces candidates, not complete semantic understanding. A 10% extraction rate and variable five-to-six categories are not implemented.
- Reason arrows require an explicit explanation by the participant with uniquely identifiable endpoints in the sentence. Negation and ambiguous candidates do not produce links. At most eight relations are displayed. Repeated questioning or a coherent story is not enough to infer causation.
- A cloud around a core value requires an explicit “most important” expression and a unique candidate. An answer to “in one phrase” or general approval in the review screen alone does not establish greatest importance.
- Participants review evidence with “accurate / slightly different / not sure yet.” Missing, negative or uncertain answers are not agreement. Changing the evidence text invalidates the old review association.
- Numbers summarize utterances, dictionary matches and displayed nodes. They do not measure psychological state, ability, strengths or identity.

Distinguishing facts, the participant's interpretation, their emotions and AI hypotheses is a writing principle. It does not mean the submitted material's three-part classification engine is implemented throughout the current voice flow. [S1, R4]

## Artifacts, records and consent

D20 (2026-10-27): Archive editing tools add conversation review/clip ideas and JSON export. Show up to five non-excluded guest quotes of at least 12 characters matching change/choice/scene words, in input order, with immediate non-excluded neighbors and estimated times. Operators can inspect question markers, repetition and responses after dissatisfaction. This is not scoring, semantic assessment, virality prediction or publication authorization; false positives occur. No extra API calls or participant editing UI. See [publication editing](production-conversations.md).

D19 navigation clarification: Each archive row has a dedicated “Participant report & signature” button linking to `#participant-report` in the detail. Once asynchronous browser-history loading completes, scroll and focus the signing/PDF section.

Added 2026-10-26 (D19): Archive details allow final publication signatures and, only after a matching signature is saved, one private participant PDF with a map, extractive summary, explanations with participant review status, reference word counts and every page of the original signed receipt. Signing does not endorse automated analysis. This contains name, contact and signature, for the participant/guardian only. History links consent ID, timestamp, scope, terms, signature image and receipt to the interview ID, retaining earlier signatures on re-signing. Save generated PDF snapshots locally for exact later downloads. Dedicated demo deployments disable real signatures and issuance. No report email, delivery verification or cloud sync (existing consent-receipt email is separate). No extra API calls. Negative or unanswered reviews remain tentative and original consent conditions are unchanged. Implementation: `participant-handover.tsx`, `src/lib/archive/participant-*.ts`; tests: `tests/participant-handover.test.ts`.

Added 2026-10-26 (D18): Direct conversation JSON downloads appear at the top of archive lists and details, alongside a title, timestamp, ID, statement counts and up to three beginning/middle/end excerpts of non-excluded guest speech. This is not an AI-generated summary and uses no additional API. JSON contains all speakers' edited, non-excluded statements with millisecond times and excerpts, excluding signatures, preparation names/locations, excluded speech, pre-correction text, audio and raw events. Personal details within speech are not automatically anonymized. Filenames distinguish date, ID and short title. This is not publication permission or a complete backup. Existing editing exports and participant flow are preserved. Implementation: `src/lib/archive/conversation-export.ts`, `src/components/live/conversation-json-download.tsx`; tests: `tests/conversation-export.test.ts`.

Editorial pages use participant quotes with three layouts and three palettes. Archives provide recordings, separate participant/AI audio, SRT, CSV, ZIP, map SVG/TXT/JSON, events and approximate replay HTML. Material absent from old archives cannot be reconstructed. [R2, R7]

Utterances can be excluded by row; guest transcripts and timing can be corrected. Exclusion affects analysis and publication text but does not automatically cut the original audio/video. [R5, R7]

Use the current code and [consent documentation](../../publication-consent.md). A permits face, voice and full-body appearance; B permits voice only; C permits back/hands views with the face cut out and voice use allowed, with processing where needed. Face and voice processing are not automatic. Opening checks do not grant publication permission; the final signature is required. Under-18 participation uses a guardian name and guardian signature, without automatic identity verification. New conditions do not expand previously signed permissions. [R6]

This describes consent implementation, not a determination of legal validity. No new blanket waiver or irrevocability condition was introduced from the submitted material.

## Environment and remaining limits

Nondemo voice needs an API key; consent storage needs dedicated operational configuration. Secrets stay outside Git. Archive data depends on the device/browser's IndexedDB. Cloud sharing, durable crash recovery, automatic external-video synchronization and animated MP4 export remain unsupported. [R2, R7, R8]

Actual API voice quality, iPad/external-microphone/external-video synchronization and real email delivery remain unverified. Mock or unit-test success does not complete those checks.

[日本語](../current-spec.md)
