import { readFileSync } from "fs";
import path from "path";
import { safeErrorMessage } from "@/lib/logging/safe-log";
import type { InterviewerAgentId } from "@/lib/magazine-flow/types";

const cache = new Map<string, string>();

const FALLBACK =
  "You are a gentle interviewer about daily skin care and memories. Speak in the guest's language.";

export function loadInterviewerPrompt(agentId: InterviewerAgentId = "default"): string {
  const key = agentId;
  const hit = cache.get(key);
  if (hit) return hit;

  const fileName = agentId === "reflective" ? "reflective.md" : "default.md";
  try {
    const filePath = path.join(process.cwd(), "prompts", "interviewers", fileName);
    const text = readFileSync(filePath, "utf8").trim();
    cache.set(key, text);
    return text;
  } catch (err) {
    console.error("[loadInterviewerPrompt]", safeErrorMessage(err));
    try {
      const legacy = path.join(process.cwd(), "prompts", "interviewer.md");
      const text = readFileSync(legacy, "utf8").trim();
      cache.set(key, text);
      return text;
    } catch {
      return FALLBACK;
    }
  }
}
