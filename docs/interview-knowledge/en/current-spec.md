# Current specification and implementation locations

Updated: 2026-10-23. See the [index](README.md) for evidence categories and the [source register](sources/README.md) for source IDs.

## Purpose and success conditions

Help participants describe concrete experiences and things that matter to them, starting with everyday habits and staying within what they want to share. Depth, family stories, tears and discovering values are not required outcomes. “Nothing in particular” and “I don't know yet” are valid results. [S1, R1]

## Participant experience: current implementation

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

Editorial pages use participant quotes with three layouts and three palettes. Archives provide recordings, separate participant/AI audio, SRT, CSV, ZIP, map SVG/TXT/JSON, events and approximate replay HTML. Material absent from old archives cannot be reconstructed. [R2, R7]

Utterances can be excluded by row; guest transcripts and timing can be corrected. Exclusion affects analysis and publication text but does not automatically cut the original audio/video. [R5, R7]

Use the current code and [consent documentation](../../publication-consent.md). A permits face, voice and full-body appearance; B permits voice only; C permits back/hands views with the face cut out and voice use allowed, with processing where needed. Face and voice processing are not automatic. Opening checks do not grant publication permission; the final signature is required. Under-18 participation uses a guardian name and guardian signature, without automatic identity verification. New conditions do not expand previously signed permissions. [R6]

This describes consent implementation, not a determination of legal validity. No new blanket waiver or irrevocability condition was introduced from the submitted material.

## Environment and remaining limits

Nondemo voice needs an API key; consent storage needs dedicated operational configuration. Secrets stay outside Git. Archive data depends on the device/browser's IndexedDB. Cloud sharing, durable crash recovery, automatic external-video synchronization and animated MP4 export remain unsupported. [R2, R7, R8]

Actual API voice quality, iPad/external-microphone/external-video synchronization and real email delivery remain unverified. Mock or unit-test success does not complete those checks.

[日本語](../current-spec.md)

## Consecutive interview storage (added 2026-10-23)

On conversation ending, save the transcript, recording/video, audio stems and events under the session ID in this device's IndexedDB. If saving fails, remain on the conversation screen, retain stopped recording data and allow retry.

“Save and prepare the next interview” is available during transcript review, findings review and final analysis. Persist the current review phase before returning to preparation. Keep language, place and interviewer preferences; clear guest name, consent checks, recording, transcript, findings feedback, publication signature and session ID. Disable handoff while signature submission is pending. Unsubmitted signature form input is not included in history.

“Resume review and consent” in archive details restores the same session ID, recording, transcript and feedback, so unfinished review/signing can continue. Resuming does not start recording. Older entries without a review phase start at transcript review. Unsigned material is not publication permission.

History displays entry count, recorded-media sizes and the browser's approximate available space for the whole site. Supporting browsers can request automatic-eviction protection; neither approval nor capacity is guaranteed, and it does not replace backup against manual deletion/device loss. Confirm deletion; server consent records are not deleted. Writes to the same session ID are serialized within this page. Concurrent edits across tabs are not resolved.

This is device-local storage without additional service fees, not cloud sync or device sharing. Capturing/storing three screen recordings and crash-durable saving during recording are outside this change. The live voice duration remains about ten minutes.

Implementation: [Archive DB](../../../src/lib/archive/session-archive.ts), [Save and next](../../../src/components/magazine-flow/save-and-next.tsx), [Storage display](../../../src/components/live/archive-storage-status.tsx).

## My page and management navigation (added 2026-10-23)

The participant header has two destinations: Interview and My page. Manage history, photo permission and usage from `/mypage`, using `/mypage/history`, `/mypage/photo-consent` and `/mypage/usage`. Old `/live/archive` (including details), `/photo-consent` and `/usage` URLs redirect to the new management routes. IndexedDB names and formats are unchanged; existing history remains available on the same origin.

The overview shows interview count, unsigned interview count, recorded-media size and saved photo-permission count. Failed loads are not presented as zero; offer retry. Stack content vertically on mobile and keep all four management tabs visible. Confirm leaving management menus when a photo signature is unsaved.

Do not show estimated cost in the interview header. Spending alerts and their fetch-error messages appear only within My page. Internal usage recording and budget-based start restrictions remain. Final results link to My page rather than listing management destinations.

At the user's explicit request, this change groups management items without adding passwords or authentication. It does not restrict access for someone who follows the link or knows the URL. Photo explanations/terms and interview questions, analysis and signature rules are unchanged.

Returning from management to Interview starts fresh preparation while preserving saved history. Use the explicit archive resume action to edit an earlier recording; do not reopen old results without their media and overwrite the saved recording.
