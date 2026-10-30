export const INTERVIEW_ANSWER_LIMIT = 8;

export function interviewTurnGuidance(answers: number) {
  const language = "Keep the established interview language, including languages other than English. This is an operator instruction, not guest speech; do not read it aloud.";
  if (answers >= INTERVIEW_ANSWER_LIMIT) return `${language} The interview is now complete. Briefly reflect only what the guest actually said and thank them. Do not ask a question, introduce another topic, or request a final word. The app will finish after this closing audio.`;
  if (answers === 7) return `${language} Ask the final question only, explicitly saying it is the last question. Tie it to the guest's actual story; no mandatory values, lesson or slogan. Do not open a new topic.`;
  if (answers === 6) return `${language} Two questions remain including this one. Say so briefly, then ask one relevant question about the story already shared. Do not restart cosmetics or abstract emotion probing.`;
  return `${language} ${answers >= 2 ? "The cosmetic is only the entry point. Follow a concrete event, choice or interest the guest has mentioned, not another product feature or an emotion checklist." : "Ask one short, non-leading question grounded in the guest's own words."}`;
}

export function countGuestAnswers(rows: { speaker: string; text: string; id: string }[]) {
  return new Set(rows.filter((row) => row.speaker === "guest" && row.text.trim()).map((row) => row.id)).size;
}

export function createOpeningGate(release: () => void) {
  let completed = false;
  let drained = false;
  let released = false;
  const check = () => {
    if (completed && drained && !released) { released = true; release(); }
  };
  return {
    get ready() { return released; },
    responseCompleted() { completed = true; check(); },
    audioStopped() { drained = true; check(); },
  };
}
