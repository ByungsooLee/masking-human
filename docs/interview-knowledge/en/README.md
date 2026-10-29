# Interview development knowledge

Updated: 2026-10-23 (Japan time). Behavior reconciliation baseline: `e81bcb3` (main). Documentation governance update baseline: `8150a26`.

This is the starting point for developing an app that uses cosmetics as an opening to hear about a person's daily life, memories, choices and values in their own words. Product reviews, psychological diagnosis and collecting moving stories are not success criteria.

D21 (2026-10-27): Following another transcript review, update [narrative entry and focus exit](production-conversations.md). Follow events rather than demand absent memories or special feelings; distinguish instructions from demonstrated live quality.

D22: [Compact instructions, varied directions and per-response usage](production-conversations.md). Compare usage breakdowns in history without conflating prompt length, conversation quality or total billing.

D23: [Introduce the project first](production-conversations.md). Align purpose and the first question across bilingual live/demo openings; preserve later conversation rules.

D24: Add [operator mini/standard comparison](production-conversations.md). Select before starting and manually compare actual model/cost in history. No automated live-quality evaluation or savings guarantee.

D25: Add [local repetition detection and short context notes](production-conversations.md). No extra AI call, but note input tokens, false positives and misses remain.

## Reading order

For D20, also see [Better conversations and publication editing](production-conversations.md). Distinguish text markers/synthetic checks from live voice and actual post performance.

1. [Current specification](current-spec.md): the current experience, implementation locations and limits.
2. [Interview playbook](interview-playbook.md): choosing the next question, situational responses and corrected fictional examples.
3. [Quality evaluation](quality-evaluation.md): observation criteria, cases and a proposed live-voice review process.
4. [Decisions and open questions](decisions-and-open-questions.md): differences from the submitted material and their treatment.
5. [Source register](sources/README.md): original material, implementation and test references.
6. [Changelog](CHANGELOG.md): scope and validation records.
7. [Development workflow](development-workflow.md): required reading, preserving established behavior and bilingual updates.

## Evidence categories

- **Current implementation**: behavior verified in code. Implementation does not demonstrate interview quality or operational validity.
- **Current instructions**: prompts actually sent to the model. Compliance is not guaranteed.
- **Submitted knowledge**: content in the NotebookLM export. The notebook's underlying sources have not been received.
- **Proposed or unresolved**: evaluation criteria, operational decisions or additional implementation ideas. These are not delivered features.

Use this folder for the current `/live` experience. The older five-stage, eight-question engine remains in the repository; its documents are retained as history. Check the linked code for implementation details and the [common prompt](../../../prompts/interviewer.md) and [styles](../../../prompts/interviewers/) for executable instructions. When documentation and code disagree, record the difference before repairing it; do not silently declare either side the approved specification.

## Maintenance rules

- Update the index, affected documents, decisions and changelog in the same PR as a specification change.
- Preserve received material; add new files under `sources/YYYY-MM-DD-description.md` and record receipt dates and limitations.
- Distinguish real transcripts from fictional examples. Do not store personal data, signatures, actual recordings or API keys here.
- Do not maintain a competing full system prompt in documentation. Change the real `prompts/` files and relevant tests when instructions change.
- Date validation records and distinguish mock checks from live-voice evaluation.
- Japanese files at the knowledge root are the editorial source; this English set is their maintained translation. Update both languages together. A translation does not authorize a behavior change. If they disagree, inspect the decision record and implementation; do not silently choose a convenient interpretation. Direct user instructions take precedence.
- The received Japanese NotebookLM export remains unchanged in the shared source archive. English explanations are in the source register; they are not a substitute primary source.

[日本語](../README.md)
