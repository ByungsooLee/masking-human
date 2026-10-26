# Reconciliation decisions and open questions

Updated: 2026-10-23. Records differences between submitted material [S1] and baseline `e81bcb3`. These decisions reconcile documentation; they do not change application behavior.

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

## Security upgrade decision: 2026-10-23

D15 follow-up (2026-10-26): A subsequent security upgrade CLI selected 16.4.3. With user authorization, update Next.js and `eslint-config-next` from 16.4.2 to 16.4.3 within existing PR #6, without creating a duplicate PR, and verify in a separate worktree. Interview, analysis, consent, executable prompts, and existing configuration remain unchanged; no codemods or additional feature adoption. Preserve the earlier 16.4.2 verification record as history and distinguish the new results in the changelog.

D15: Following the user's `next upgrade --agent=security` request and the CLI-selected same-major target, update Next.js from 16.4.0 to 16.4.2 and align `eslint-config-next` to 16.4.2. Set `experimental.agentUpgrade` to `security`, preserving Cache Components, Partial Prefetching and CSS configuration. Conversation, analysis, consent and executable prompts remain unchanged. Only dependency versions and the explicit reminder policy change; no Future Defaults are adopted. Evidence is the CLI-generated upgrade instructions and the installed Next.js `agentUpgrade` guide. See the changelog for verification and remaining audit findings.
