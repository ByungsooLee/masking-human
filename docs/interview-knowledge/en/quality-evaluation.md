# Conversation quality and validation

Updated: 2026-10-23. The observation criteria and acceptance conditions below are a **proposed evaluation framework**. They are neither a validated measurement scale nor an implemented automatic judge. [S1, R9]

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
