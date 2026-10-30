import "server-only";

export const PIPELINE_MODELS = {
  transcription: "openai/whisper-large-v3-turbo",
  reply: "google/gemini-3.1-flash-lite",
  fallback: "openai/gpt-oss-120b",
  speech: "heygen/heygen-voice-1-turbo",
} as const;

export function pipelineBudget() {
  const amount = Number(process.env.INTERVIEW_MONTHLY_BUDGET_USD ?? "5");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("PIPELINE_CONFIGURATION");
  return amount;
}

export function requirePipelineConfig() {
  if (!process.env.OPENROUTER_API_KEY || (process.env.INTERVIEW_OPERATOR_PASSWORD?.length ?? 0) < 8) throw new Error("PIPELINE_CONFIGURATION");
  pipelineBudget();
}

export async function verifyPipelineCredit() {
  requirePipelineConfig();
  const response = await fetch("https://openrouter.ai/api/v1/credits", { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("PIPELINE_CREDIT_CHECK");
  const result = await response.json() as { data?: { total_credits?: number; total_usage?: number } };
  const remaining = Number(result.data?.total_credits) - Number(result.data?.total_usage);
  if (!Number.isFinite(remaining)) throw new Error("PIPELINE_CREDIT_CHECK");
  if (remaining <= 0) throw new Error("PIPELINE_CREDITS");
}

export async function fetchPipelineRates(voice = process.env.OPENROUTER_TTS_VOICE ?? "nadine") {
  const catalogs = await Promise.all(["text", "transcription", "speech"].map(async (modality) => {
    const response = await fetch(`https://openrouter.ai/api/v1/models?output_modalities=${modality}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("PIPELINE_CATALOG");
    return (await response.json() as { data: { id: string; pricing: { prompt: string; completion: string }; supported_voices?: string[] }[] }).data;
  }));
  const rates: Record<string, { input: number; output: number }> = {};
  for (const model of Object.values(PIPELINE_MODELS)) {
    const item = catalogs.flat().find((candidate) => candidate.id === model);
    const input = Number(item?.pricing.prompt);
    const output = Number(item?.pricing.completion);
    const ceiling = model === PIPELINE_MODELS.speech ? 0.000008 : model === PIPELINE_MODELS.transcription ? 0.00001 : 0.000004;
    if (!item || !Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || input > ceiling || output < 0 || output > ceiling) throw new Error("PIPELINE_CATALOG");
    rates[model] = { input, output };
  }
  if (!catalogs.flat().find((item) => item.id === PIPELINE_MODELS.speech)?.supported_voices?.includes(voice)) throw new Error("PIPELINE_VOICE");
  return rates;
}
