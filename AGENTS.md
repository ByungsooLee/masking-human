<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Interview knowledge: required before development

Before implementing, fixing, refactoring, or changing prompts in this repository:

1. Read `docs/interview-knowledge/README.md`, `current-spec.md`, `decisions-and-open-questions.md`, and `development-workflow.md` in that directory. Their maintained `en/` counterparts are equally usable.
2. For conversation, prompt, or analysis work, also read `interview-playbook.md` and `quality-evaluation.md`. Follow the source register to inspect the relevant code and existing tests before editing.
3. Briefly state the documents read and the established behavior being preserved. Inspect existing diffs; preserve user changes and unrelated work.
4. Treat the current specification as the baseline. Do not silently replace established behavior with assumptions, legacy specifications, raw NotebookLM examples, or unapproved proposals. Distinguish implementation, model instructions, submitted knowledge, and proposed/unresolved items.
5. For behavior changes authorized by the user's request, update the affected specification, append a decision with reason/before/after/impact/evidence/validation, and update relevant tests in the same PR. Preserve prior decisions and source originals. Existing user authorization remains sufficient; routine implementation within scope does not require renewed permission.
6. Maintain Japanese editorial documents and their English counterparts in the same PR. Preserve evidence/decision IDs and unresolved status. If documents, languages, or code disagree, surface and reconcile the discrepancy using existing decisions and user intent; ask only when a necessary intent decision is missing. Do not silently rewrite documentation to fit the code.
7. Complete the PR template's knowledge/behavior/translation/validation fields. Documentation-only edits must state that behavior is unchanged. Mock checks do not establish live-voice quality.

Direct user instructions take precedence. These rules supplement the Next.js rules above; keep this section outside the generated block so it survives regeneration.
