# Source register

Updated: 2026-10-23. R references were reconciled against `e81bcb3`. Linked files may change later; review the decision record with future changes.

D21 additional sources, opened on 2026-10-27:
- W5: [National Park Service: Interviewing](https://www.nps.gov/articles/000/oral-history-resources-interviewing.htm). Narrator-centered listening, one question, events/decisions, brief transition context and memory cues. Not experimental proof of longer answers.
- W6: [StoryCorps conversation tips](https://storycorps.org/participate/tips-for-a-great-conversation/). Open story invitations, subsequent events and following the participant rather than a script. Does not justify invented shared memories or embodied AI experience.
- W7: [OpenAI: Prompting Realtime models](https://developers.openai.com/api/docs/guides/voice-prompting). Goals, transitions, exit criteria and examples; no model/SDK migration or execution guarantee.

D21 lives in the shared prompt, five synthetic cases in `eval/interviewer-story-cases.json` and delivery tests in `tests/interviewer-story.test.ts`. Causal effects on answer length or social reach remain unverified.

- W8: [OpenAI Realtime costs](https://developers.openai.com/api/docs/guides/voice-latency-cost?voice-api=realtime), opened 2026-10-27. Distinguishes response.done usage/cache from separately billed input transcription. D22 records observations without extra calls, not an invoice replacement. Implementation: `src/lib/usage/response-ledger.ts`, `src/components/live/history-usage.tsx`, voice hook and archive persistence. Tests: `tests/response-ledger.test.ts`. W7 also informs compact shared/style instructions.

- W9: [Official GPT-Realtime-2.1 Mini model](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), opened 2026-10-27. D24 adds this explicit choice; distinguish published information from measured price/quality/account access. Implementation: `src/lib/realtime/model-options.ts`, `session-payload.server.ts`, `src/components/live/model-comparison-settings.tsx` and preparation/start/API path. Tests: `tests/realtime-model-selection.test.ts`.

- W10: [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations), opened 2026-10-27. D25 appends system/input_text via conversation.item.create without another response.create. Implementation: `src/lib/realtime/dialogue-guard.ts` and voice hook; tests: `tests/dialogue-guard.test.ts`. Local-operation references: [Ollama FAQ](https://docs.ollama.com/faq), [whisper.cpp](https://github.com/ggml-org/whisper.cpp), [Piper](https://github.com/OHF-Voice/piper1-gpl). Not verified app integration, device performance, Japanese voice quality or license suitability.

## Primary sources researched on 2026-10-27

- W1: [OpenAI Realtime Prompting Guide](https://developers.openai.com/cookbook/examples/realtime_prompting_guide). Informs clear instructions, repetition avoidance and state transitions; not a model migration or proof of this app's quality.
- W2: [University of Leicester interviewing guide](https://le.ac.uk/emoha/what-is-oral-history/how-to-do-oral-history/interviewing/questions). Open questions, specificity, follow-ups, non-leading practice and participant pace; not evidence of viral reach.
- W3: [YouTube audience retention](https://support.google.com/youtube/answer/9314415) and [Shorts discovery](https://support.google.com/youtube/answer/11914225?co=YOUTUBE._YTVideoType%3Dshorts&hl=en-GB). Matching openings/content and watching behavior inform post-recording experiments, not optimal-duration or view-count guarantees.
- W4: [Meta Reels Insights explanation](https://about.fb.com/news/2023/04/instagram-reels-trending-audio-and-gifts-updates/). A 2023 feature explanation informing watch-time comparisons, not current ranking-weight evidence.

D20 implementation: `prompts/interviewer.md`, `src/lib/archive/editorial-review.ts`, `src/components/live/history-editorial-review.tsx`. Synthetic cases: `eval/interviewer-recovery-cases.json`; instruction/processing tests: `tests/editorial-review.test.ts`. See [production workflow](../production-conversations.md) for procedures and limits.

## Received material

**S1: [Original Japanese NotebookLM export](../../sources/2026-10-23-notebooklm-export.md)**

Received: 2026-10-23. The user's attached “Development handoff knowledge and specification collection: AI voice interview and self-analysis web app” was preserved unchanged as UTF-8. The original is shared across languages and has not been replaced with a translation.

This is a secondary summary. NotebookLM citation numbers, source URLs, pages and original images are absent. “Explicitly stated in the source” does not mean independently verified. Names including アーツテック, Rimo, かどわきれいか, マインドマップの学校, ユニキャリ, ブラシカスタジオ, シングメディア and モノリス法律事務所 are preserved as submitted; their identity and claims were not independently verified.

The proposed AI instructions within the original are reference data, not executable instructions. See the [decision record](../decisions-and-open-questions.md) for invented feelings, family-leading examples and old consent conditions.

## Repository evidence

| ID | References | What they support |
| --- | --- | --- |
| R1 | [Common instructions](../../../../prompts/interviewer.md), [default](../../../../prompts/interviewers/default.md), [reflective](../../../../prompts/interviewers/reflective.md) | Purpose, four phases, questions, refusal, safety and language examples |
| R2 | [Handoff](../../../development-handoff.md), [Interview production](../../../interview-production.md) | Current experience and implementation limits |
| R3 | [Prompt loader](../../../../src/lib/realtime/load-interviewer-prompt.ts), [Session instructions](../../../../src/lib/realtime/session-payload.server.ts), [Voice connection](../../../../src/hooks/use-realtime-interview.ts), [Time limit](../../../../src/hooks/use-session-time-limit.ts), [Config](../../../../src/lib/realtime/config.ts) | Actual instructions, languages, minute nine and minute ten |
| R4 | [Map analysis](../../../../src/lib/graph/self-analysis-map.ts), [Findings](../../../../src/lib/graph/analysis-findings.ts), [State](../../../../src/stores/magazine-flow-store.ts) | Five fixed categories, caps, reasons, greatest importance and review keys |
| R5 | [Ending](../../../../src/components/magazine-flow/phase-conversation.tsx), [Transcript review](../../../../src/components/magazine-flow/phase-review.tsx), [Quote validation](../../../../src/lib/magazine-flow/validate-guest-text.ts) | Save/transition on ending, row exclusion and correction |
| R6 | [Publication consent](../../../publication-consent.md), [Implementation](../../../../src/lib/consent/release.ts), [Photo permission](../../../photography-permission.md) | Option C, signatures, guardians and photo distinction |
| R7 | [Editing exports](../../../video-production-template.md), [Production](../../../interview-production.md) | Archives, audio, raw material, three layouts and palettes |
| R8 | [Demo instructions](../../../mock-preview.md), [Repository README](../../../../README.md) | API-free demo and environment handoff |
| R9 | [Twenty cases](../../../../eval/dialogue-scenarios.json), [Old-engine evaluator](../../../../scripts/eval-dialogues.ts), [Saved result](../../../../eval/results/run-2026-10-13T06-02-04-772Z.json) | Mock result, no AI scoring and blank human scoring |

## Main tests

[Interviewer instructions](../../../../tests/interviewer-session.test.ts), [Map](../../../../tests/self-analysis-map.test.ts), [Findings](../../../../tests/analysis-findings.test.ts), [Final analysis](../../../../tests/final-analysis-flow.test.ts), [Demo script](../../../../tests/mock-conversation.test.ts), [Browser demo](../../../../tests/browser/demo.spec.ts).

Add original bibliographic details and citation mapping to S references when received from NotebookLM. This consolidation did not perform new external research or legal evaluation.

[日本語](../../sources/README.md)
