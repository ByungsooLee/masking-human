# Required reading and change workflow

Updated: 2026-10-23. [日本語](../development-workflow.md)

## Read before implementing

Before development, fixes, refactoring or prompt tuning, read root [AGENTS.md](../../../AGENTS.md), the [index](README.md), [current specification](current-spec.md) and [decisions/open questions](decisions-and-open-questions.md). For conversation, prompt or analysis work, also read the [playbook](interview-playbook.md) and [quality framework](quality-evaluation.md), then inspect relevant [sources](sources/README.md), implementation and existing tests. Either maintained language is acceptable.

Briefly identify the files read and rules to preserve when starting. Reading documents does not replace inspecting the code being edited and its callers. Before writing Next.js code, follow AGENTS.md and read the installed version's relevant guide.

## Avoid unintended overwrites

1. Inspect `git status` and existing diffs. Do not revert or overwrite user changes or unrelated work.
2. Identify request scope, behavior to preserve, behavior to change and applicable decision IDs. Do not turn refactoring, translation or styling into unrelated specification changes.
3. Preserve the distinction between current implementation, current instructions, submitted knowledge and proposed/unresolved items. Do not copy examples from raw or historical material directly into executable prompts or new specifications.
4. Surface discrepancies between documents/code or languages. Resolve what existing decisions and user instructions already authorize; ask only where intent is genuinely needed. Do not silently rewrite documentation to justify code.
5. For authorized behavior changes, append the reason, before/after behavior, impact, evidence and validation to the decision record, and update the affected specification and relevant tests in the same PR. Retain earlier decisions with a superseding reference. Do not request authorization already granted by the user again.

Use the documented current specification as the default baseline. Editing a document does not deliver missing features or guarantee model behavior.

## Bilingual and source maintenance

- Japanese root documents are the editorial source and `en/` contains corresponding translations. English does not define a separate specification. Update both languages in the same PR.
- Translate naturally while preserving numbers, constraints, evidence IDs, decision IDs and unresolved status. Do not hide substantive disagreement by simply preferring Japanese; inspect code and decisions and reconcile it. Direct user instructions take precedence.
- Add links to the corresponding language. Keep the index, source register and changelog current.
- `sources/2026-10-23-notebooklm-export.md` is the preserved received text. Never overwrite it with corrections or translation. Store new received material as new dated files; distinguish added translations/summaries from originals.
- Do not invent citations, participant feelings, causation, family relationships or consent conditions. New source material is not automatically an adopted specification.

## Review and completion

Use the PR template to report documents read, behavioral impact, bilingual maintenance, decision records and validation. For documentation-only changes, explicitly state that behavior is unchanged and why; unrelated documents need no edits.

Check links and diffs, run validation appropriate to the change and complete CI. For prompt/conversation changes, map checks to the quality framework and distinguish mock success from live-voice quality. Paid API and real email execution must stay within existing authorization.

These instructions and the PR template are development/review rules. They do not automatically prove that every developer read the files, that translations are semantically equivalent or that implementation follows the specification.
