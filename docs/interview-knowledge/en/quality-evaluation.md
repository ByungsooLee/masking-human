# Conversation quality and validation

D34: Exercise the installed `@openai/agents-realtime` event delivery without network access. Verify that `response.output_audio.done` alone does not release playback and matching `output_audio_buffer.stopped` does. Flow tests cover no automatic paid retry on failure, answer-round deduplication, queued speech grouping, short acknowledgements and stop/refusal priority. Upstream is stubbed; real microphone, acoustics, latency and devices remain unverified.

D33: Human-review bilingual synthetic `eval/interviewer-bounded-cases.json` for practical reasons without personality claims, accepting unclear answers, following events and ending without another question. Progress, SDK-mock and low-cost tests cover opening protection, empty/duplicate input and closing audio drain after eight answers. Not proof of real engagement, acoustics or latency.

D26 (2026-10-30): `tests/pipeline*.test.ts` uses synthetic/stubbed budget concurrency, persistence, Supabase revision conflicts, authentication, backup routing, uncertainty, VAD, sentence speech, final transcription on shutdown, stopping during initialization and bilingual costs. Actual voice models/database/invoices/browser remain unverified. Before promotion, compare ten-minute interviews in both languages for question quality, speech-end-to-first-audio delay, playback leakage, interruption, recording alignment and actual cost. See [setup and validation](low-cost-voice.md).

Updated: 2026-10-23. The observation criteria and acceptance conditions below are a **proposed evaluation framework**. They are neither a validated measurement scale nor an implemented automatic judge. [S1, R9]

D21 (2026-10-27): An additional real text-log review distinguishes question presence from narrative progress. Observe whether participants provide an event's sequence, their action and outcome, can finish their account, and are not pressed for absent memories or assigned invented connections. Do not score short answers or total length as failure; respect refusal. The five bilingual cases in `eval/interviewer-story-cases.json` are synthetic and intended for human review. `tests/interviewer-story.test.ts` checks instruction delivery across both styles/languages and existing marker limitations, not generated semantic quality.

D22: `tests/response-ledger.test.ts` covers synthetic usage/deduplication/exports/privacy; existing persistence tests cover ledger retention on result resaves. A prompt character ceiling prevents bloat, not a token-savings or quality acceptance test. Human review must check guest-appropriate direction changes and repetitive scene requests. Live-model quality and actual bills remain unverified. Compare model/prompt hash/revision in usage JSON and account separately for unpriced transcription and missing costs.

D23: `tests/interviewer-session.test.ts` checks both styles/languages for purpose before product, one question and first-turn-only instructions. `tests/mock-conversation.test.ts` checks the bilingual first line appears once. These checks do not establish spoken delivery or reduced boredom.

D24: `tests/realtime-model-selection.test.ts` checks allowlisting, server defaults, unchanged instructions/voice, upstream/usage consistency for both models, invalid requests, persistence and bilingual UI. Upstream API is stubbed without charges. For quality comparisons, record language/topic/length/prompt revision and evaluate repetition, context, naturalness, waiting and cost separately. Cheap does not imply good; live results remain unverified.

D25: `tests/dialogue-guard.test.ts` uses synthetic utterances for repeat candidates, answer excerpts, Japanese/English matching, incomplete/excluded/refused cases, deduplication, cooldown/cap and non-generation events. It does not score semantic understanding, next-question improvement or live delivery. Evaluate reduced repetition, preserved legitimate probing and token overhead separately using dialogueGuidance, usage and audio.

## Observation criteria

| Dimension | Good | Acceptable | Needs improvement |
| --- | --- | --- | --- |
| Context understanding | Naturally follows the participant's words into a new focus | Relevant but formulaic acknowledgment | Repeats answered questions or forces a return to products |
| Naturalness and brevity | Brief acknowledgment, one focused question, room to respond | Slightly long but clear what to answer | Stacked questions or interrupting explanations |
| Depth | Explores concrete experiences the participant wants to discuss | Limited depth while respecting choice | Repeated “why,” forced depth or quotas |
| Non-leading approach | Adds no unconfirmed people, feelings or causes | Checks uncertain understanding while allowing correction | Assumes family, reassurance or personality |
| Respect for agency | Accepts refusal, correction and ending | One clarifying question only when needed | Pursues refusal, rejects corrections or obstructs ending |

A single turn with multiple focuses or invented feelings still needs correction. Diagnosis, invented participant/AI histories, pursuit after refusal or treating material as publishable without consent are serious failures. Do not average them away. Closed consent/safety questions and closing without a question are not violations.

## Proposed additional cases

| Case | Expected observation |
| --- | --- |
| No cosmetic use | Moves naturally to daily life without judging nonuse |
| Repeated short or “nothing special” answers | No invented feelings or mechanical repetition; asks about a concrete scene |
| Only lotion use disclosed | Does not add moisturization, reassurance or learning from a mother |
| Story expands into work or hobbies | Follows the interest without returning to products |
| Family topic declined | Does not ask the same question in another form |
| Silence or sad experiences | Does not stack questions, advise or praise |
| Contradiction or rejected AI interpretation | Checks time/context and accepts correction |
| Ending request, minute nine, minute ten | Separately checks instruction updates and actual stopping; no rushed extra questions |
| Exclusion and transcript correction | Updates analysis, quotes and text exports; does not retain review against changed evidence |
| Family, causation or greatest importance absent from text | Leaves these unconfirmed rather than inventing nodes or relations |
| Japanese, English, another language in English mode | Distinguishes interview-language instructions from UI language |

## Existing validation assets and limits

- D20 (2026-10-27): `eval/interviewer-recovery-cases.json` contains six synthetic Japanese/English cases. `tests/editorial-review.test.ts` verifies instruction delivery to both styles, text markers on negative examples, and clip exclusions/context/timing/placement. It is neither model-generated replay nor an automatic pass/fail judge.
- Local history markers cover punctuation/request phrases, interpretive expressions and exact repetition only. Closings/quotes can create false positives. Zero markers does not mean a pass; humans must assess recovery against original audio/context.
- For the next live comparison, separately record model, actual instruction version, language and start time, then assess non-leading behavior, context, progress and participant choice. Log posting outcomes over equal observation windows separately; view counts are not conversation-quality scores. Agree on permission and an API cost cap first.

- `tests/interviewer-session.test.ts`: common prompt, style and session instruction consistency.
- `tests/self-analysis-map.test.ts`, `tests/analysis-findings.test.ts`, `tests/final-analysis-flow.test.ts`: evidence, classification and review flow.
- `tests/mock-conversation.test.ts`, `tests/browser/demo.spec.ts`: script and demo operation, not proof of generated voice quality.
- `eval/dialogue-scenarios.json` and `scripts/eval-dialogues.ts`: twenty replay scenarios for the older engine, not the current Realtime conversation.
- Saved `eval/results/run-2026-10-13T06-02-04-772Z.json`: mock provider, no AI scores, human review blank. It is not evidence of completed real-model or human quality review.

Find links in the [source register](sources/README.md). Date execution results in the [changelog](CHANGELOG.md).

## Proposed live-voice review process

After obtaining authorization for paid API use, record model, instruction version, language and case ID, and review conversations with participant consent. For each utterance record source text, AI response, dimension, evidence and suggested correction. Initially compare reviewers' judgments. Keep recordings and personal data outside the public repository.

The proposed acceptance report combines absence of serious failures with dimension-level judgments. Case counts, repeat counts, pass rates and reviewers remain undecided. This documentation work did not conduct live-voice evaluation.

[日本語](../quality-evaluation.md)
