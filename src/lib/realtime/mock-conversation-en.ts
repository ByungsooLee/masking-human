import { INTERVIEW_OPENING } from "./interview-opening";

const BASE: Record<string, string> = {
  "mock-ai-1": INTERVIEW_OPENING.en,
  "mock-guest-1": "My skin gets dry, so I use toner and moisturizer every day.",
  "mock-ai-backchannel": "Toner and moisturizer are part of your daily routine.",
  "mock-ai-2": "Who introduced you to that routine?",
  "mock-guest-2": "My mother. In middle school, she showed me how to apply it beside her at the mirror.",
  "mock-ai-3": "How did you feel standing beside your mother at the mirror?",
  "mock-guest-3": "I felt happy, as though I had grown up. Now my daughter and I use the same moisturizer.",
  "mock-ai-4": "What difference does that time with your daughter make?",
  "mock-guest-4": "Time with family matters. Applying moisturizer feels reassuring and reminds me of my mother.",
  "mock-ai-5": "What does that skincare time mean to you?",
  "mock-guest-5": "Applying moisturizer gives me a sense of reassurance.",
  "mock-ai-6": "What kind of time would you like to share with your daughter in the future?",
  "mock-guest-6": "I want to keep using the same moisturizer with her. Time with family matters most.",
  "mock-ai-close": "Making time to connect with people runs through your family life and work. Thank you for sharing your story today.",
};

const DEEP: readonly [string, string][] = [
  ["Time with family matters to you. When do you usually talk together?", "After dinner, we take our time talking about the day."],
  ["You make room for unhurried conversations. What led you to value that time?", "My mother used to listen to my stories about school."],
  ["She listened to your school stories. What particular moment do you remember?", "In middle school, I talked to her after an argument with a friend."],
  ["How did you feel when she listened?", "Being able to talk gave me reassurance."],
  ["What helped you feel that reassurance?", "My mother never rushed me, so I could share how I felt."],
  ["Not being rushed mattered. How do you listen to people now?", "I wait until my daughter finishes, rather than rushing to offer an answer."],
  ["You leave space before answering. Where does that approach show up outside your family?", "At work, I listen to colleagues when they are struggling."],
  ["You make time to listen at work too. What led you to choose your current work?", "An experience of helping someone who came to me for advice."],
  ["That experience stayed with you. What recent moment has felt meaningful?", "A new colleague shared a concern and started to smile a little."],
  ["That small smile stayed with you. How have you changed compared with your earlier self?", "I listen instead of rushing to give the right answer."],
  ["Listening has become important to you. What would you like to make more time for?", "Listening patiently to other people and to my own feelings."],
  ["In one phrase, what do you want to value in your life now?", "Time to connect with people, including my family."],
];

export function englishMockText(id: string): string | undefined {
  const match = id.match(/^mock-(ai|guest)-deep-(\d+)$/);
  if (match) return DEEP[Number(match[2]) - 1]?.[match[1] === "ai" ? 0 : 1];
  return BASE[id];
}
