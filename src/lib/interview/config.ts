export function getInterviewProviderMode(): "mock" | "openai" {
  const mode = process.env.INTERVIEW_PROVIDER?.toLowerCase();
  if (mode === "openai") return "openai";
  return "mock";
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function getEvalJudgeModel(): string {
  return process.env.OPENAI_EVAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
