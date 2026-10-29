import type { TranscriptEntry } from "@/lib/magazine-flow/types";

export const EDITORIAL_REVIEW_VERSION = "2026-10-27.1";
export const CLIP_SIGNALS = [
  { id: "change", ja: "変化を示す語", en: "Words about change", pattern: /以前|昔|前は|今は|変わっ|変化|used to|but now|changed/iu },
  { id: "choice", ja: "選択を示す語", en: "Words about choices", pattern: /選ん|選ぶ|決め|やめ|続け|choose|chose|decid|stopped|keep/iu },
  { id: "scene", ja: "場面を示す語", en: "Words about a scene", pattern: /昨日|あの日|あの時|そのとき|初めて|last week|yesterday|first time/iu },
] as const;

function publicStatement(entry: TranscriptEntry) {
  return { id: entry.id, speaker: entry.speaker, text: entry.text, startedAtMs: entry.startedAt, endedAtMs: entry.endedAt };
}

export function buildClipCandidates(transcript: readonly TranscriptEntry[]) {
  return transcript.flatMap((entry, index) => {
    if (entry.excluded || entry.speaker !== "guest" || Array.from(entry.text.trim()).length < 12) return [];
    const signals = CLIP_SIGNALS.filter((signal) => signal.pattern.test(entry.text)).map((signal) => signal.id);
    if (!signals.length) return [];
    const before = transcript[index - 1]; const after = transcript[index + 1];
    const context = [before && !before.excluded && before.text.trim() ? before : null, entry, after && !after.excluded && after.text.trim() ? after : null]
      .filter((row): row is TranscriptEntry => Boolean(row));
    const start = context[0].startedAt; const end = context[context.length - 1].endedAt;
    const hasTiming = Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start;
    return [{
      id: entry.id,
      quote: entry.text,
      signals,
      startMs: hasTiming ? start : null,
      endMs: hasTiming ? end : null,
      timingPrecision: "utterance-estimate; verify against audio",
      context: context.map(publicStatement),
      contextMayBeIncomplete: !before || before.excluded === true || !after || after.excluded === true,
      needsPrivacyReview: true,
      publicationApproved: false,
    }];
  }).slice(0, 5);
}

export function reviewConversation(transcript: readonly TranscriptEntry[]) {
  const active = transcript.filter((entry) => !entry.excluded && entry.text.trim());
  const seen = new Set<string>();
  const turns = active.filter((entry) => entry.speaker === "ai").map((entry) => {
    const checks: string[] = [];
    const questions = (entry.text.match(/[?？]/gu) ?? []).length;
    const closing = /今日はありがとうございました|ここで(?:終|止)|終了します|お疲れさまでした|(?:we can|let.s|we.ll) stop (?:here|now)|goodbye|thanks for (?:your time|speaking|sharing)|thank you for (?:speaking|your time)/iu.test(entry.text);
    if (!questions && !/教えて|聞かせて|tell me|describe/iu.test(entry.text) && !closing) checks.push("no_question_marker");
    if (questions > 1) checks.push("multiple_question_marks");
    if (/感じが(?:ある|あり|する)|なのかな|かなと(?:思|感じ)|ように聞こえ|seems? like|it sounds like|i feel that/iu.test(entry.text)) checks.push("interpretation_phrase");
    const normalized = entry.text.trim().replace(/\s+/gu, " ").toLowerCase();
    if (seen.has(normalized)) checks.push("repeated_reply");
    seen.add(normalized);
    return { id: entry.id, text: entry.text, checks };
  });
  const recovery = transcript.flatMap((entry, index) => {
    if (entry.excluded || entry.speaker !== "guest" || !/だから何|何が聞きたい|つまらない|つまんない|そういう気持ちはない|そういう意味ではない|boring|what is your point|not what i meant|don.t feel that/iu.test(entry.text)) return [];
    const next = transcript[index + 1];
    return [{ guest: publicStatement(entry), nextAi: next?.speaker === "ai" && !next.excluded ? publicStatement(next) : null }];
  });
  return {
    method: "local-text-markers-not-a-quality-score",
    aiTurnCount: turns.length,
    guestTurnCount: active.filter((entry) => entry.speaker === "guest").length,
    turnsToReview: turns.filter((turn) => turn.checks.length),
    recoveryToReview: recovery,
  };
}

export function buildEditorialReviewExport(sessionId: string, transcript: readonly TranscriptEntry[]) {
  return {
    schemaVersion: 1,
    reviewVersion: EDITORIAL_REVIEW_VERSION,
    sessionId,
    timingUnit: "milliseconds",
    isViralPrediction: false,
    note: "Local text matches for human review, not semantic assessment or publication permission. Edited text only; no excluded speech, originalText, signatures or media. Personal details in speech are not automatically anonymized. Review complete audio/video and consent before editing or publication.",
    review: reviewConversation(transcript),
    candidates: buildClipCandidates(transcript),
  };
}
