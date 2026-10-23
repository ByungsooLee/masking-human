# Source register

Updated: 2026-10-23. R references were reconciled against `e81bcb3`. Linked files may change later; review the decision record with future changes.

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
