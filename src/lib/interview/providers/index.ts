import { getInterviewProviderMode } from "../config";
import type { InterviewModelProvider } from "./types";
import { MockInterviewProvider } from "./mock-provider";
import { OpenAIInterviewProvider } from "./openai-provider";

let cached: InterviewModelProvider | null = null;

export function getInterviewProvider(
  override?: "mock" | "openai",
): InterviewModelProvider {
  const mode = override ?? getInterviewProviderMode();
  if (!override && cached && cached.name === mode) return cached;

  const provider =
    mode === "openai"
      ? new OpenAIInterviewProvider()
      : new MockInterviewProvider();

  if (!override) cached = provider;
  return provider;
}

export { MockInterviewProvider, OpenAIInterviewProvider };
export type { InterviewModelProvider, GenerateTurnParams } from "./types";
export { ProviderError } from "./types";
