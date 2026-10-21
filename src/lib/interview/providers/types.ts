import type { InterviewSession, ParticipantCommand } from "../types";
import type { InterviewTurnOutput } from "../schemas";

export interface GenerateTurnParams {
  session: InterviewSession;
  userMessage: string;
  command: ParticipantCommand;
  isOpening?: boolean;
}

export interface InterviewModelProvider {
  readonly name: string;
  generateTurn(params: GenerateTurnParams): Promise<InterviewTurnOutput>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "api_failure" | "parse_failure" | "config",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
