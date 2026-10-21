export type UsageTokenSnapshot = {
  inputTokens: number;
  outputTokens: number;
  /** Input audio tokens billed at inputAudio rate (excludes cached audio). */
  inputAudioTokens: number;
  /** Input text tokens billed at inputText rate (excludes cached text). */
  inputTextTokens: number;
  cachedInputTextTokens: number;
  cachedInputAudioTokens: number;
  outputAudioTokens: number;
  /** Visible / transcript text output (excludes audio and reasoning). */
  outputTextTokens: number;
  /** Reasoning tokens (gpt-realtime-2.1); billed at outputText rate. */
  reasoningOutputTokens: number;
};

export type SessionUsageRecord = {
  sessionId: string;
  model: string;
  startedAt: number;
  endedAt: number | null;
  estimatedUsd: number | null;
  usage: UsageTokenSnapshot;
  isMock: boolean;
};

export type BudgetStatus = {
  budgetUsd: number | null;
  monthlyUsd: number | null;
  monthlyAvailable: boolean;
  todayEstimatedUsd: number;
  remainingUsd: number | null;
  warning80: boolean;
  blocked100: boolean;
  pricingConfigured: boolean;
};

export type UsageSummary = BudgetStatus & {
  currentSessionEstimatedUsd: number | null;
  costsNote: string;
};
