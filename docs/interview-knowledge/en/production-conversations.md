# Better conversations and publication editing

[日本語](../production-conversations.md)

Updated: 2026-10-27. D20 implementation and workflow. Evaluate participant comfort/safety separately from post performance. This is not a virality guarantee or predictor.

## Instructions for new conversations

### D34: WebRTC playback events and recovery (corrects D33 implementation errors)

- SDK `audio_stopped` signals generation, and generic `audio_start` is absent on WebRTC; neither controls progression. Match `response.created` IDs to `response.done` and `output_audio_buffer.started/stopped/cleared`. Opening release/closing completion require successful generation and stopped for the same response. Ignore stale IDs; never treat cleared as successful closing.
- Disable the AI-owned input stream tracks before handing them to SDK/connect. Preserve the separate recording stream and stop owned tracks on end/failure/disposal. Ending during initialization must prevent later reconnection.
- Pause visibly on errors/failed/incomplete responses without automatic paid retries. Explicit Resume requests the same round once without incrementing the eight-answer count. If generation/playback cannot be confirmed in 90 seconds, show an error and offer Resume/Finish rather than cutting audio and pretending success.
- Count response rounds, not transcription IDs, using shared store/UI state. Group queued segments into one response. Exclude only known acknowledgments up to 1.2 seconds that began during AI playback on Realtime. This is not complete noise detection or semantic answer classification.
- Put stopping/refusal/skipping first in progression instructions. Topic refusal does not mean ending the interview or publication consent. Do not add automatic spoken-intent termination; preserve Finish. Remove the obsolete nine-minute session.update and retain only next-response closing state. New revision: `2026-10-30.story.2`.

Also test installed SDK event processing with only network connection replaced. Match the official [WebRTC playback events](https://developers.openai.com/api/reference/resources/realtime/server-events), covering generation-only non-release, IDs, playback ordering/clearing, explicit recovery, acknowledgments and grouped segments. Mock/local SDK success does not establish live audio, iPad or speaker playback latency. Signatures, analysis and old transcripts remain unchanged.

### D33: One short story with a visible ending (2026-10-30; supersedes older time allocations)

Push the review baseline as `afbc534`, then improve conversations separately. Aim for six to eight questions and close after eight nonempty guest answers. Nonempty clarification/skip answers also count; this is not semantic classification of main questions. Ten minutes is a safety ceiling, not a target duration. Preserve early Finish.

- Introduce the project, approximately eight questions and the map. Products occupy one or two entry questions, then follow an event, choice or interest actually shared. Continue one story through actions and outcomes rather than emotion checklists or rephrasing an unclear question. Do not require quotes, drama or family.
- After six answers announce two questions remain; after seven ask the final question; after eight briefly reflect and thank without another question. Enter existing review after closing audio drains. The next answer after nine minutes also closes; retain the ten-minute hard stop. Display the answer count.
- Disable automatic Realtime VAD responses; request one response per nonempty completed transcription, deduplicating IDs. Combine progression with initial instructions. Initial prompt hashes do not cover dynamic progression; transcription-wait latency requires device testing.
- Mute the AI microphone until both opening generation and playback finish. Remove already-arrived opening-boundary input items from AI conversation history rather than counting them as guest answers; do not delete the separate recording. Low-cost detection also ignores opening/closing input. Failures show errors or preserve Finish rather than silently appearing completed.
- New live prompt revision: `2026-10-30.story.1`. Old transcripts, signatures and analysis remain unchanged. Demos only inherit shared opening wording; no eight-answer controller on their fixed script.

Evidence: current feedback and existing non-leading/storytelling guidance. Confirm manual response settings in the official [Realtime events reference](https://developers.openai.com/api/reference/resources/realtime/client-events) and installed SDK. Progress, SDK-mock and low-cost tests cover empty/duplicate input, opening protection and closing audio drain. Bilingual `eval/interviewer-bounded-cases.json` contains synthetic author-written examples, not participant transcripts or generated model evaluation. Live audio, engagement, feedback, synchronization and latency remain unverified. No paid API calls.

- Preserve one focus/question, the approximate ten-minute limit and four phases. Acknowledgment may be integrated into the question; avoid full repetition every turn.
- Follow the participant's words into a concrete scene, their action and their own reasons. Do not demand emotional meaning from a practical answer.
- Do not equate vague acknowledgment with agreement. After two short answers, change focus. Briefly acknowledge dissatisfaction and change the next question. Refusal, stopping and corrections take priority.
- Ordinary life, preferences and natural humor count. Do not require tears, family, hardship, profound conclusions or quotable lines. Do not demand retakes or social-media performance while interviewing.
- Executable instructions live in `prompts/interviewer.md` and `prompts/interviewers/`. Existing connected sessions, scripted demos and old transcripts are not retroactively changed.

## D21: Invitations to tell an event (2026-10-27)

An additional text-only transcript review showed that asking a question every turn does not ensure progress: procedural order, special feelings and scenery can still lead nowhere. D20's markers and instructions were insufficient on their own. The JSON does not establish vocal delivery or the actual prompt revision; do not infer participant personality or psychology. Do not copy real transcripts or personal details into evaluation assets.

- For routine-only answers, try one entry such as how it began or a recent choice. Immediately leave a focus with no remembered episode; do not repackage it as calm, sensations or scenery.
- Once an event appears, invite the overall account first. Then follow missing parts only: what happened → participant action → outcome → present interpretation, one focus at a time. These are guides, not mandatory feelings or lessons.
- Time, objects and participant-mentioned people may cue memory, but do not assume special memories or family. Clarify fragments or uncertain transcription instead of combining separate activities.
- Long answers are not a quota. No scenery does not mean no thoughts. Participant topic choice, refusal and stopping take priority.

Evidence: W2 and W5–W7 in the source register. This adapts oral-history practice; it is not experimental proof of longer answers or viral reach. Update executable instructions and examples only; demos, old logs, UI, analysis, model and API call count remain unchanged.

`eval/interviewer-story-cases.json` contains five synthetic Japanese/English cases. Human review should check whether the participant supplies an event, action and development, whether they can finish, and whether absent memories are respected. Question marks, answer length or zero markers do not establish success. `tests/interviewer-story.test.ts` verifies instruction delivery and evaluation-asset structure only, not generated/live-voice improvement.

## D22: Compact instructions, varied directions and response usage (2026-10-27)

D21's scene/sequence invitations can themselves become repetitive. Consolidate the shared prompt from 6,538 to 2,497 characters (about 62% less), plus shorter style supplements. Characters are not tokens and do not promise equivalent billing savings. Follow events, relationships, choices or changes as the participant introduces them; these are alternatives, not a fixed sequence. Opinions and ordinary life count. Do not demand an episode every turn or return to products. Preserve one question, four phases, approximate ten minutes, non-leading practice, refusal/stopping, language, analysis and consent. No model migration, forced history truncation or paid evaluation.

New live sessions record response ID/status/output item IDs, approximate elapsed time, text/audio/cache/reasoning tokens and cost breakdowns. Deduplicate response IDs client- and server-side; retain interrupted response usage. Record a server-generated SHA-256/character count/revision of the actual instructions, the model and a pricing snapshot. Do not include full instructions, conversation text, API keys or signatures in usage records.

Review under “API usage per response (operator)” in archive details. Save usage JSON, the conversation JSON usage field or editing ZIP usage.json. No participant UI or participant PDF additions. Record observed transcription tokens/duration separately without pricing them. Subtotals are neither invoices nor complete bills: missing events, transcription and other API calls are excluded. Later transcript exclusion does not erase processing costs.

Old entries/demos show missing usage, not reconstructed figures. Preserve ledgers at conversation end and subsequent result saves. Browser deletion loses the archive; server aggregates remain in memory. Failed reporting may leave server estimates incomplete while observed local records remain. Final event delivery before closing is not guaranteed.

Evidence: user authorization and W7–W8. Synthetic tests cover bucket splitting, deduplication, persistence, exports, privacy, prompt size and delivery. Interesting conversations, actual savings, live voice and invoice reconciliation require separate evaluation.

Prompt hash/revision/characters describe the full initial session instructions, not the closing-time notice appended at nine minutes. History and JSON explicitly state this limitation.

## D23: Explain the project before asking about a product (2026-10-27)

Replace the abrupt greeting/product opening with the purpose: use everyday cosmetics/skincare to get to know what the participant enjoys and values, then summarize their story in a mind map. Ask one product question and wait; do not stack a permission question or alternative-habit list. This is not publication consent or a psychological diagnosis.

Keep bilingual wording in one place shared by both live styles and the first demo line. Applies to new live sessions; only the opening may use three brief sentences/about twenty seconds. Preserve subsequent brevity, one question and language adaptation. No extra API calls or guarantee of interesting conversation/live compliance. D22's character figures describe that earlier consolidation; usage JSON records the initial full instructions after this addition.

## D24: Compare mini with standard (2026-10-27)

1. Open “Operator settings · model comparison” in preparation, choose Mini and start. Store the choice with this browser's preparation settings. Server configuration uses the existing environment/default model.
2. Select standard for a separate interview. Keep language, persona, prompt revision and approximate topic/length comparable. No automatic duplicate API calls, scoring or generated comparison sessions.
3. Review actual model, cost, response count and prompt hash in archive usage; save JSON. Assess repetition, context, naturalness, interruptions and waiting using original audio/experience. Do not attribute different interview conditions solely to model choice.

If mini is unavailable or errors, show the selected model's error rather than falling back to standard. Re-select manually. Restrict client selection to the two models and return 400 for invalid settings rather than silently charging a default. Demos cannot compare live models. Transcription remains unchanged, separately billed and excluded from subtotals. No local inference, other-provider API or chained-pipeline migration in this change.

## D25: Repetition detection without another AI call (2026-10-27)

Check the last four completed AI replies locally. Detect matching normalized final questions, or three questions with the same scene/sequence/feeling angle. Append a brief system note with at most two participant excerpts of 100 characters each, asking the model to consider existing answers and another focus. Label excerpts as unverified data, not instructions. Prioritize refusal/stopping/clarification, do not invent corrections or meanings, and omit excluded rows.

Detection occurs after generation: it cannot retract a spoken question or force replacement of the next one. Different wording may escape detection and necessary probing may trigger a warning. Notes are therefore tentative and preserve needed clarification.

No judge-model call, response.create, audio interruption or rewriting of history; preserve normal VAD behavior. Limit to two notes/session at least four completed replies apart. Local detection is free of API calls, but reading notes can add subsequent input tokens. Append short conversation items instead of replacing the entire prompt each turn. History/JSON dialogueGuidance contains target ID, reason and approximate time only, not note text/excerpts. Reset state per new session.

Running local LLM, transcription and speech synthesis can remove external usage fees, not hardware/power/maintenance costs or license/Japanese-voice constraints. This guard needs no local AI installation; none is performed.

## Operator review in history

Open “Media & social exports” and “Conversation review & clip ideas.” No editing UI is added to participant preparation, conversation or results.

- Clip ideas: up to five non-excluded guest statements of at least 12 characters matching change/choice/scene words, in input order. Show exact speech and immediate non-excluded neighbors; do not reconstruct context across excluded rows.
- Word matching does not assess meaning, interest or causality. No candidates is valid. Preserve negations/qualifications and check estimated times against original audio.
- AI review markers: no question mark/request expression, multiple question marks, interpretive phrasing and exact repetition. Closings/quotes can cause false positives; markers can also miss issues. They do not certify question quality, listening, interruption handling, diagnosis or safety.
- Show guest dissatisfaction/correction markers alongside the next AI turn for manual recovery review. Quoted complaints or stories about others may also match.
- Download JSON directly or as `editorial-review.json` in editing ZIPs. Excluded speech, pre-correction text, signatures, preparation metadata and media are omitted. Spoken personal details are not automatically anonymized. Publication permission is always a separate check.

## Evaluation

Two short answers is an operational cue when no new leads emerge, not a scientific threshold. Follow concrete new information even when an answer is brief.

`eval/interviewer-recovery-cases.json` contains six synthetic Japanese/English cases inspired by failure categories, not copied participant dialogue, medical history or personal information. Preferred responses are authored illustrations, not generated model results.

`tests/editorial-review.test.ts` verifies instruction delivery to both styles, text markers, exact quotes, exclusions, timing and placement. String checks and synthetic cases do not establish live-voice improvement. Agree on permission and a cost cap separately for live API evaluation; use the [quality framework](quality-evaluation.md) for human review.

## Edit after recording

1. Select a participant-owned scene and check meaning, negations, conditions and signed scope.
2. Try a short structure: participant line, necessary question/context, event, participant-owned ending. Show only the relevant map branch as supporting material.
3. A 30–60-second single-story edit is an initial experiment, not a universal optimum. Do not demand a strong opening during recording.
4. Record platform, publication date, duration, opening and observation window. Compare available chose-to-watch, average watch time, percentage viewed, shares and saves under comparable conditions. Distribution and audience fit can affect even good conversations.

Automatic posting, media cutting, SNS connections and performance collection are not implemented. See source register W1–W4.
