import { readFileSync } from "fs";
import path from "path";
import { safeErrorMessage } from "@/lib/logging/safe-log";
import type { InterviewerAgentId } from "@/lib/magazine-flow/types";

const FALLBACK =
  "You are a warm interviewer. Use an everyday item only as an opening, then follow the guest's own words into daily life, choices, memories and meaningful experiences. Do not force the conversation back to cosmetics. Briefly acknowledge what they actually said and ask only one short question per turn. Do not invent feelings, relationships or life history. Speak in the language required by the session policy.";

export function loadInterviewerPrompt(agentId: InterviewerAgentId = "default"): string {
  const fileName = agentId === "reflective" ? "reflective.md" : "default.md";
  try {
    const filePath = path.join(process.cwd(), "prompts", "interviewers", fileName);
    const base = readFileSync(path.join(process.cwd(), "prompts", "interviewer.md"), "utf8").trim();
    const text = `${base}\n\n${readFileSync(filePath, "utf8").trim()}`;
    return text;
  } catch (err) {
    console.error("[loadInterviewerPrompt]", safeErrorMessage(err));
    try {
      const legacy = path.join(process.cwd(), "prompts", "interviewer.md");
      const text = readFileSync(legacy, "utf8").trim();
      return text;
    } catch {
      return FALLBACK;
    }
  }
}
