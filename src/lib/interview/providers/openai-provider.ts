import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  InterviewTurnOutputSchema,
  type InterviewTurnOutput,
} from "../schemas";
import { buildSystemPrompt, buildUserPrompt } from "../prompts";
import type { InterviewModelProvider, GenerateTurnParams } from "./types";
import { ProviderError } from "./types";
import { getOpenAIModel } from "../config";

export class OpenAIInterviewProvider implements InterviewModelProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new ProviderError("OPENAI_API_KEY is not set", "config");
    }
    this.client = new OpenAI({ apiKey: key });
  }

  async generateTurn(params: GenerateTurnParams): Promise<InterviewTurnOutput> {
    const { session, userMessage, command, isOpening } = params;
    const model = getOpenAIModel();

    try {
      const completion = await this.client.chat.completions.parse({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: buildSystemPrompt(session) },
          {
            role: "user",
            content: buildUserPrompt({
              session,
              userMessage,
              command,
              isOpening,
            }),
          },
        ],
        response_format: zodResponseFormat(
          InterviewTurnOutputSchema,
          "interview_turn",
        ),
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new ProviderError("Empty parsed response from OpenAI", "parse_failure");
      }
      return parsed;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : "Unknown OpenAI error";
      throw new ProviderError(message, "api_failure");
    }
  }
}
