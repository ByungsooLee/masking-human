# Low-cost voice and always-visible costs (D26)

[日本語](../low-cost-voice.md)

Updated 2026-10-30. Implementation and setup. Live voice quality and monthly spending have not been measured.

## Review hardening (D31; supersedes older details below)

- Keep eight-character passwords with scrypt comparison; sign cookies using a separate secret. Development creates an ignored, mode-600 `private-usage/session-secret`. Production requires `INTERVIEW_SESSION_SECRET` with at least 32 cryptographically random characters (for example `openssl rand -hex 32`). Password/secret rotation invalidates old cookies. Device sign-out deletes its cookie; revoking stolen copies requires secret rotation.
- Atomically count successful and unsuccessful attempts: five globally per fifteen minutes locally; five per sender and thirty globally on Supabase. Apply `007_operator_attempts.sql` before public deployment. Storage failures deny login; limits return 429 and a fifteen-minute retry message. Arbitrary IP headers are not trusted. This is not complete DoS protection.
- Set `INTERVIEW_APP_ORIGIN=https://your-host.example` behind HTTPS termination for Origin checks and Secure cookies. Exempt only the two existing admin POST paths from cookies; retain their `X-Admin-Key` authentication. Native Vercel Cron GET is not thereby supported.
- Default budget is $5, preserving explicit settings. Vercel requires Supabase. Other production file storage requires explicit `INTERVIEW_USAGE_STORE=file` on a single host with persistent storage. Lock failures stop safely; never steal potentially live locks based on age. Operators must stop all writers before removing crash-left locks.
- Keep approximately one second of pre-roll; require 400ms continuous voice normally and 600ms during AI speech. Track whole AI turns across sentence gaps. Empty transcription resumes interrupted speech/reply once; repeated noise pauses for manual recovery. New recovery requests may cost money. Hallucinated noise transcription and acoustic feedback are not guaranteed to be eliminated.
- Save failed/deferred audio intervals in usage history and warn in review/history to check the recording. Never invent transcript text or automatically pay to retry after finishing. STT timeout is 55 seconds. Reply 404 falls back once under the same privacy and price restrictions.
- Upstream reconciliation of unresolved charges, actual PCM sample rate, and iPad/external-microphone noise/synchronization remain unimplemented or unverified. Unknown reservations are never released as $0. Real-device/deployed-database checks remain necessary before public operation. Conversation and consent/signature conditions are unchanged.

## Engine and experience

Choose the low-cost engine in preparation under “Interview engine / operator access.” Existing Realtime remains the initial default pending device comparison. The demo makes no paid AI API calls. Preserve the purpose-first introduction, one question, non-leading interview, refusals/corrections, bilingual UI, multilingual instructions in English mode, ten-minute limit, transcript editing/exclusion, participant review, signed release, PDF and history.

One server-side OpenRouter key serves these models:

| Stage | Initial model | Accounting |
| --- | --- | --- |
| Transcription | `openai/whisper-large-v3-turbo` | Duration; reported cost preferred, otherwise duration estimate |
| Replies | `google/gemini-3.1-flash-lite` | Input/output tokens; per-request maximum provider prices |
| Reply backup | `openai/gpt-oss-120b` | One attempt after 429, selected HTTP timeout responses or 5xx; no automatic resubmission after an uncertain network outcome |
| Speech | `heygen/heygen-voice-1-turbo` | Character estimate; default `nadine`, interpreted as PCM16LE, 44.1kHz mono |

At each new connection the public catalog verifies models, rates and voice. Input ceilings: text models $4/million tokens, STT $0.00001/second, TTS $8/million characters; the same model-specific numeric ceilings apply to output. Unavailable or excessive prices prevent startup. Rates are saved per interview, with voice fixed in server configuration. This allowlist does not establish quality or future availability.

Without a voice environment setting, the man interviewer persona uses `bram`; other personas use `nadine`. Pin the selected voice and initial instructions for the interview so later environment changes do not mix into an active conversation.

Reuse the recorder microphone and AudioContext. AudioWorklet converts input to 16kHz; keep up to roughly 0.5 seconds of pre-roll and end a turn after roughly 1.1 seconds of silence. Answers longer than 35 seconds are transcribed in chunks without generating a reply until the guest finishes. This amplitude-based detector needs device testing for environmental noise, acknowledgments and playback leakage.

After the complete reply text arrives, request speech by sentence and prefetch the next sentence. Play incoming PCM while it streams. This does not speak sentences while the LLM is still generating them. Interruptions stop playback and outstanding reply work; history retains displayed sentences with an interruption marker. An interrupted sentence may still be displayed in full, so this is not word-level playback alignment. Shared timing and AI output feed the existing recording and separate stems.

Send history without trimming, up to 100 messages and 50,000 characters; exceeding the limit returns an error rather than silently dropping refusals or corrections. Automatic history compression is not implemented. Local repetition guidance is capped at two notes without another judging model. Maps, statistics and existing report analysis stay local; there is no additional end-of-session LLM call.

## Setup

Set these in the Git-ignored `.env.local`. Never put keys/passwords in chat or `NEXT_PUBLIC_` variables.

```dotenv
OPENROUTER_API_KEY=your-server-side-key
INTERVIEW_OPERATOR_PASSWORD=your-random-password-at-least-8-characters
INTERVIEW_MONTHLY_BUDGET_USD=10
OPENROUTER_TTS_VOICE=nadine
```

Local accounting uses Git-ignored `private-usage/`. Development/tests can override this using an absolute `INTERVIEW_USAGE_DIR`; production local execution uses the fixed project directory, and deployment bundles exclude the ledger. Locks serialize concurrent writes, and corrupt storage does not reset to an empty ledger. After a crash, an operator may remove a leftover `.lock` directory only after checking that no writer remains. Back up this ledger, including reservations.

For multiple Vercel instances, apply `supabase/migrations/006_interview_costs.sql` to the existing Supabase database. Configure server-side `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Only service role can access the table; revision comparisons retry conflicting updates. Adding the SQL file does not apply it to an existing database. Vercel refuses paid operations without shared storage. Local environments with Supabase configured also use that database and never switch to a fresh local ledger after a database failure.

Shared storage separates monthly counters from per-interview details. RPCs return only the requested interview and monthly totals rather than transferring all monthly line items every three seconds. Read-only requests do not rewrite revisions; detail changes and monthly counter updates commit in the same database transaction.

Sign in using the operator password in preparation. The signed HttpOnly/SameSite cookie lasts eight hours, with Secure on HTTPS. Do not store the password in localStorage or conversation JSON. When configured, operator authentication covers all non-demo APIs except login and health. On Vercel, missing password configuration also blocks APIs. This is operator access, not participant login or external report delivery.

Preparation explains processing by OpenRouter and its providers. Requests set `data_collection: deny`; this does not establish identical retention rules across providers. Review OpenRouter input/output logging settings and provider data handling before field use.

## Costs and budget

D30: A key's monthly limit is separate from purchased credits. Check balance through a read-only endpoint before recording and when connecting; a zero balance prompts a top-up. A failed lookup is not treated as zero. Upstream 402 errors direct operators to check both balance and key limits. Balance checks do not generate paid audio.

The interview header stays visible while scrolling and displays session/month amounts to four decimal places. Details show models, transcription, replies, speech and backup attempts. Refresh every three seconds and after operations; display delayed updates, pending calculations and missing amounts. $1, 80% and 100% threshold states are visible without expanding details. Notifications are in-app, not email or OS notifications. Archive a snapshot; “Refresh recorded charges” retrieves and saves a newer one. Include accounting in usage JSON, without burning it into participant PDFs or editing visuals.

Use “reported” for OpenRouter `usage.cost`, “estimated” for token/duration/character calculations and “unresolved” for uncertain outcomes. Provider-reported amounts are not settled invoices. Estimate TTS by characters after stream completion; never invent a charge for an interrupted or unknown operation. Pending entries older than two minutes become unresolved while keeping their reservations.

The monthly budget covers this app’s OpenRouter requests only, excluding OpenAI Realtime, other apps, top-up fees, tax and hosting. Attribute each interview to its UTC start month, including ten-minute interviews that cross a month boundary. Do not reconstruct previous Realtime or missing months as zero usage.

Conservatively reserve before each operation using maximum tokens, UTF-8 bytes and other units, and reject duplicate request IDs. Release the difference after completion; keep reservations for uncertain outcomes. Insufficient funds block new AI operations while recording, finishing and saving remain available. The resume button explains that it creates new paid requests. Provider price changes and delayed billing prevent a strict invoice ceiling guarantee; also configure an OpenRouter key spending limit.

## Validation and promotion

Stubbed unit tests cover authentication, concurrent reservations, persistence, backup routing, uncertain outcomes, audio contracts, final transcription during shutdown, stopping during initialization and bilingual display. They do not make paid requests.

2026-10-30: Execute migration 006 in an isolated in-memory PGlite database, checking reserve-to-settle totals, rejection of stale revisions and denial of anonymous RPC execution. This does not establish live Supabase connectivity or apply the migration to deployment.

Before making this engine the default, compare ten-minute Japanese and English interviews for ease of storytelling, non-leading questions/repetition, end-of-speech-to-first-audio latency, interruption, iPad/external microphone operation, external camera alignment and actual charges. Distinguish these observations from successful mocks.

## Primary references checked 2026-10-30

- [STT contract and cost reporting](https://openrouter.ai/blog/tutorials/transcription-on-openrouter/)
- [TTS contract and streaming](https://openrouter.ai/docs/guides/overview/multimodal/tts)
- [Model catalog](https://openrouter.ai/api/v1/models)
- [Provider selection and data settings](https://openrouter.ai/docs/guides/routing/provider-selection)

Catalog checks covered text, transcription and speech output modalities. These references do not guarantee future rates/availability or this app’s live voice quality.
