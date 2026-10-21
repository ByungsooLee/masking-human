import { randomUUID } from "crypto";
import type {
  AccumulatorEntry,
  HypothesisEntry,
  InterviewSession,
} from "./types";
import type { InterviewTurnOutput } from "./schemas";

function lastUserUtteranceId(session: InterviewSession): string | null {
  for (let i = session.turns.length - 1; i >= 0; i--) {
    if (session.turns[i].role === "user") return session.turns[i].id;
  }
  return null;
}

function entry(text: string, sourceUtteranceId: string | null): AccumulatorEntry {
  return {
    id: randomUUID(),
    text: text.trim(),
    sourceUtteranceId,
  };
}

function mergeEntries(target: AccumulatorEntry[], items: string[], utteranceId: string | null): void {
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    if (target.some((e) => e.text === t)) continue;
    target.push(entry(t, utteranceId));
  }
}

function mergeHypotheses(
  target: HypothesisEntry[],
  items: string[],
  utteranceId: string | null,
): void {
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    if (target.some((h) => h.text === t)) continue;
    target.push({
      ...entry(t, utteranceId),
      confirmed: false,
      rejected: false,
    });
  }
}

/** Detect explicit confirmation / rejection of a pending hypothesis in user text. */
export function reconcileHypothesesWithUserReply(
  session: InterviewSession,
  userText: string,
): void {
  const lower = userText.toLowerCase();
  for (const h of session.accumulator.hypotheses) {
    if (h.confirmed || h.rejected) continue;
    const snippet = h.text.slice(0, 40).toLowerCase();
    if (!snippet || !lower.includes(snippet.slice(0, 20))) continue;
    if (/\b(yes|yeah|that'?s right|exactly|correct)\b/i.test(userText)) {
      h.confirmed = true;
      session.accumulator.confirmed_insights.push({
        id: randomUUID(),
        text: h.text,
        sourceUtteranceId: h.sourceUtteranceId,
      });
    } else if (/\b(no|not really|that'?s wrong|don'?t think so)\b/i.test(userText)) {
      h.rejected = true;
    }
  }
}

export function applyTurnAnalysis(session: InterviewSession, output: InterviewTurnOutput): void {
  const utteranceId = lastUserUtteranceId(session);
  const analysis = output.internal_analysis;

  mergeEntries(session.accumulator.facts, analysis.facts_from_participant, utteranceId);
  mergeEntries(
    session.accumulator.participant_stated_values,
    analysis.participant_stated_values,
    utteranceId,
  );
  mergeHypotheses(session.accumulator.hypotheses, analysis.proposed_hypotheses, utteranceId);

  if (analysis.participant_declined_topic && analysis.declined_topic_label) {
    const label = analysis.declined_topic_label.trim();
    if (label && !session.declinedTopics.includes(label)) {
      session.declinedTopics.push(label);
    }
  }
}
