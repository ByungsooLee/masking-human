import type { InterviewerAgentId } from "@/lib/magazine-flow/types";

export const INTERVIEWER_AGENTS: { id: InterviewerAgentId; labelKey: "agentDefault" | "agentReflective" }[] = [
  { id: "default", labelKey: "agentDefault" },
  { id: "reflective", labelKey: "agentReflective" },
];
