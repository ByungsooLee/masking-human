# THE HUMAN MIRROR — concept and production handoff

[日本語](../the-human-mirror-handoff.md)

Updated 2026-11-03 (Japan time). Decision THM-01. Reviewed main: `5b031c75e7783cd378206f1a2f1b8c1ff131e65b`.

This is a planning handoff, not an implemented specification or runtime prompt. The relationship between THE HUMAN MIRROR (working title) and the app name 手入れの記憶 is unresolved.

## Evidence and status

The primary authority is the user's repository integration request of 2026-11-03. Reference: the latest 10 turns of ChatGPT conversation 豪州YouTube参考分析, ID 6ae97570-8e94-83e8-8ea2-9b333790460e. Some retrieved messages were truncated; this is not a complete transcript. Earlier assistant suggestions are not independent evidence of product performance or commercial success. Experiment counts, timing allocations and evaluation methods below are proposals developed for this handoff.

| Status | Content |
| --- | --- |
| Established direction | AI talks with people worldwide in multiple languages, exploring their values. Participant, AI and photographer jointly create work. Build the photographer's own artistic brand as well as character recognition |
| Established constraints | Unplanned street encounters; target 1–3 minutes of cooperation; no relocation, makeup, changing clothes or prolonged commitment; record the scope of recording, publication and editing permission |
| Leading hypotheses | Choose a brought beauty item, question an AI hypothesis about now/future, let the person's answer revise its understanding; live action with a reusable character; portrait and composite souvenir ending |
| Technical direction to test | Sony α7R III stills, Ace Pro 2 video, iPad Pro M1 128GB/8GB RAM conversation and recording, Mac editing; offline-first is a development goal, not implemented |
| Unresolved | Final name, character/voice, photographer appearance/speech, ending, models/software, immediate delivery, business route, one format versus multiple series |

The earlier idea that AI directs the photographer and the photographer must remain silent is a historical option, not a mandatory specification. On-camera appearance and speech remain creative choices.

## Creative brief

Working tagline: Beauty is the starting point. Humanity is the subject.

The AI is a curious listener whose hypotheses people can correct. Participants contribute choices, reasons and revisions; the photographer contributes light, framing and editing. Credits, visual style and portfolio connections should build the author's value beyond character popularity.

The leading format offers items brought by production: parasol, sheet mask, perfume, lipstick, etc. A participant's own belongings are an alternative entry point. Looking, pointing or holding must suffice; applying products is unnecessary. This is not a product review or a judgment of beauty benefits.

“Is this for now or the future?” is provisional, not a fixed product taxonomy or diagnosis. Accept both, neither, declining to choose and ordinary answers. Do not invent surprise or learning. “Updating understanding” describes dialogue, not model retraining or memory across participants.

Fictional example: AI asks whether an item is for today; the person says it reminds them of their mother; AI asks whether connection rather than time is the relevant meaning. Correct the interpretation if rejected; never publish an unconfirmed interpretation as the person's value. This is neither a real transcript nor a production prompt.

## Proposed street session

| Approximate time | Action |
| --- | --- |
| 0–30 seconds | Explain purpose, duration, recording, later compositing and intended use; confirm willingness to participate and be recorded |
| 30–90 seconds | Choose one item, ask one reason, revisit the now/future hypothesis if useful |
| 90–130 seconds | Briefly check the person's meaning and jointly adapt a photo idea to the immediate setting |
| 130–180 seconds | Take Sony portrait; confirm publication/editing scope and signature; explain delivery |

Measure total time including explanations and consent. Three minutes is a target, not a promise. Reduce questions/photos or withhold publication if necessary; do not skip signatures. The current app's analysis review may not fit: a short mode requires separate design.

## Live action, character and photographs

Composite a reusable character into Ace Pro 2 footage, sitting on stairs, a wall or bench and appearing to converse. Reserve frame space, establish an eye-line marker and height, keep the camera as stable as possible, and record a short clean background plate. Walking, physical contact and complex occlusion are not initial requirements.

The leading ending is a Sony portrait plus character souvenir composite. Keep the original, photographer's finished portrait and composite separately, associated with the same shoot ID. Let the author's image stand independently of the character. Automatic transfer, immediate iPad compositing and high-quality on-site delivery are unverified; compare later finishing on Mac.

Character design is underway in another chat. Golden Eggs is a reference for instant recognizability, not a style or character to imitate. Test small-screen silhouettes, transparency, separated eyes/mouth/body, a few expressions and mouth shapes, and strong still poses. Final assets, rights, voice and rig are unresolved.

## Technical plan and current implementation

| Stage | Target/test | Current limits |
| --- | --- | --- |
| Capture | Sony α7R III / Ace Pro 2; vertical framing, eye-line, distortion, exposure | No camera integration or transfer added here |
| iPad conversation | M1 128GB/8GB RAM; test local STT, LLM and TTS | Current Realtime/OpenRouter paths use cloud services; low cost does not mean offline |
| Audio | Separate participant/AI and mixed audio, transcript and timing | Existing history exports may help; latency, missing tracks and interruption limitations remain |
| Mac editing | Audio sync, captions, reusable lip sync, shadow, eye-line, occlusion and photo composites | Automatic external sync, character generation and composite MP4 are unimplemented |
| Automation | Fixed assets and incremental lip-sync/caption/template automation | No guarantee of unattended commercial quality; human selection, finishing and release review remain necessary |

Do not replace the app's usual 6–8 questions, approximately eight answer rounds and ten-minute safety ceiling with this production target. Preserve the five analysis categories and existing map-led video template. Street conversations and character editing are additional concepts; implementation requires specification, prompt and test updates.

On iPad, measure airplane-mode startup, inference, recording and saving; recognition/pronunciation per language; noise performance; cold start and median/worst response time; heat, battery, free space, lock/interruption and recovery. RAM alone proves nothing: test model size, concurrent processing and app constraints. Offline failure handling—stop, human facilitation, or explicitly disclosed online switching—is unresolved; do not silently upload.

On Mac, compare beginning/end sync cues for offset, drift and lip sync. Test short Japanese/English/Korean samples, original/translated captions, position, shadows, occlusion, frame edges and export. Record software/rig choice, cost and manual time per episode; do not assume unverified product capabilities.

## Consent and asset management

Follow existing [publication consent](../publication-consent.md) and [photography permission](../photography-permission.md). Initial acknowledgement is not publication permission. Preserve signatures, exclusion review and face/voice restrictions. Photo and interview forms have separate IDs/history; operators must maintain external asset associations.

No form or terms change here. Check whether existing wording adequately records character compositing, private delivery, each social channel, photographer portfolio use and later advertising separately. Photo simple-v1 excludes corporate advertising, third-party stock sales, AI training and face compositing. Adding a character beside someone differs from face compositing but is not automatically authorized either. Resolve explanations and any additional permission before release.

Apply B/C restrictions to souvenir composites too; face/voice processing is manual. Excluded speech remains in source audio, so review every published track and caption. Private delivery and public posting are separate decisions. Keep consent/contact records away from editing assets; never commit signatures, real recordings or originals. Preserve previous signed conditions and retention periods.

## Social experiments and author brand

Test 20–35-second vertical videos on TikTok, Instagram Reels and YouTube Shorts. Proposed sequence: 0–3 seconds choice/question; 3–18 answer and follow-up; 18–27 revised understanding; 27–35 portrait/composite. Compress shorter versions and do not force every conversation into this order. Preserve context and corrections without fabricating quotes or conflict.

Vary one factor at a time: opening, character presentation or photo ending. Record per-platform retention, completion, saves, shares, comment meaning and interest in the author's profile/work. Align metric definitions, availability and observation windows; raw cross-platform views are not equivalent. This does not predict virality or revenue.

Test photographer credits and a character-free portfolio connection, including inquiry interest. Never expose consent receipts or private participant contacts through that connection.

## Retained concepts and business choices

| Concept | Joint output | Constraint |
| --- | --- | --- |
| Cosmetics philosophy × art | A visual idea based on the person's choice | Surfing with a parasol or swimming in a mask are imaginative examples, not street requirements; adapt to available light, background and poses |
| First frame of a five-minute film | Opening still of an imagined film | No obligation to shoot a five-minute film; focus discussion on one central idea |
| Long-used belongings × art | Portrait connecting an object and personal reasons/memories | No special possession or emotional story required |
| AI/human co-creation | Revised words, gestures or a small scene | The short film itself may be the output instead of a separate photograph |

Life on Film is a success reference named by the user: turn natural participant material into finished work and consider a show-to-studio route. Identity, revenue and causal success claims were not independently verified here and must not become financial assumptions.

Business direction remains open: original show/production studio, cosmetics/beauty photographer, or artist through exhibitions/books/work. Compare time, cost, audience interest in photographs, sustainability, commissions/collaboration inquiries and permission differences between advertising and artwork. Character-only expansion also depends on its relationship to the author brand.

## Initial experiments — proposed, not performed

| Order | Experiment | Evidence and next decision |
| --- | --- | --- |
| E1 | One 20–35-second edit with fictional dialogue and placeholder character | Check captions, lip sync, compositing, two photo versions and initial/repeat editing time; do not wait for final character |
| E2 | Three conversations each in Japanese, English and Korean, in quiet and street-like noise | Airplane-mode completion, audio gaps, latency, battery, heat, storage; revise architecture if inadequate, without claiming offline support |
| E3 | Three to five informed collaborators; measure total session time | Feasibility of 1–3 minutes including consent, burden, leading questions, eye-line and portrait; shorten or withhold |
| E4 | Two to three trials/posts each for cosmetics and another concept, within permission | Compare equal observation windows per platform, author-work interest and production burden; small samples only suggest direction |

Counts are proposals, not authorization to publish. Separate private trials from release permission and record failures, refusals and unpublished work. No paid API or real email was used for this handoff.

Priority unresolved items: (1) receive character/voice/assets and rights from the other chat; (2) offline architecture and failure handling; (3) short consent/review flow; (4) photo compositing/delivery timing; (5) photographer speech/appearance and ending; (6) one versus multiple series; (7) name and business route. The planner/photographer initially owns these decisions; implementation owners should submit their next proposal with E1/E2 evidence.

THM-01: Existing material mainly covered the interview app and map-based editing. This request adds a show concept, separating established direction, hypotheses, unresolved choices and current implementation; the earlier silence idea is not mandatory. Documentation only. Validation covers links, diff and bilingual correspondence; device/audio quality, posting results and composite quality remain untested.
