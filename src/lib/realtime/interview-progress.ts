export const INTERVIEW_ANSWER_LIMIT = 8;

export function interviewTurnGuidance(answers: number) {
  const language = "The guest's wish to stop, refuse a topic or skip takes priority over every question count below: do not insist on that question. If they want to end, briefly thank them without another question; a topic refusal or skip does not imply consent or ending the entire interview. Keep the established interview language, including languages other than English. This is an operator instruction, not guest speech; do not read it aloud.";
  if (answers >= INTERVIEW_ANSWER_LIMIT) return `${language} The interview is now complete. Briefly reflect only what the guest actually said and thank them. Do not ask a question, introduce another topic, or request a final word. The app will finish after this closing audio.`;
  if (answers === 7) return `${language} Ask the final question only, explicitly saying it is the last question. Tie it to the guest's actual story; no mandatory values, lesson or slogan. Do not open a new topic.`;
  if (answers === 6) return `${language} Two questions remain including this one. Say so briefly, then ask one relevant question about the story already shared. Do not restart cosmetics or abstract emotion probing.`;
  return `${language} ${answers >= 2 ? "The cosmetic is only the entry point. Follow a concrete event, choice or interest the guest has mentioned, not another product feature or an emotion checklist." : "Ask one short, non-leading question grounded in the guest's own words."}`;
}
