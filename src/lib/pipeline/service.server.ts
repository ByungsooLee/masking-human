import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";
import { INTERVIEW_OPENING } from "@/lib/realtime/interview-opening";
import { INTERVIEW_ANSWER_LIMIT, interviewTurnGuidance } from "@/lib/realtime/interview-progress";
import { PIPELINE_MODELS, fetchPipelineRates, pipelineBudget, requirePipelineConfig, verifyPipelineCredit } from "./config.server";
import { pipelineTransaction } from "./store.server";
import { summarizePipelineCost, type PipelineCharge, type PipelineSession, type PipelineSettings } from "./types";

export const PipelineSettingsSchema = z.object({
  agentId: z.enum(["default", "reflective"]),
  interviewLanguage: z.enum(["ja", "en"]),
  interviewerProfile: z.object({ age: z.enum(["young", "adult", "senior"]), gender: z.enum(["woman", "man", "neutral"]) }).optional(),
});
const location = { sessionId: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/u) };
const operation = { ...location, requestId: z.string().uuid() };
const message = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12000) });
export const PipelineRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), settings: PipelineSettingsSchema }),
  z.object({ action: z.literal("close"), ...location }),
  z.object({ action: z.literal("transcribe"), ...operation, audio: z.string().min(44).max(1900000) }),
  z.object({ action: z.literal("reply"), ...operation, messages: z.array(message).min(1).max(100), answerCount: z.number().int().min(1).max(INTERVIEW_ANSWER_LIMIT).optional(), guidance: z.enum(["repeated_question", "repeated_angle"]).optional() }),
  z.object({ action: z.literal("speak"), ...operation, text: z.string().min(1).max(1200) }),
]);
export type PipelineRequest = z.infer<typeof PipelineRequestSchema>;

function sessionFor(state: { sessions: Record<string, PipelineSession> }, sessionId: string, active = true) {
  const session = state.sessions[sessionId];
  if (!session || (active && (session.closed || Date.now() - session.createdAt > 12 * 60 * 1000))) throw new Error("PIPELINE_SESSION");
  return session;
}

function expirePending(state: { sessions: Record<string, PipelineSession> }) {
  for (const session of Object.values(state.sessions)) for (const entry of session.entries) {
    if (entry.status === "pending" && Date.now() - Date.parse(entry.at) > 120000) entry.status = "unknown";
  }
}

export async function pipelineCost(month: string, sessionId: string) {
  return pipelineTransaction(month, (state) => {
    expirePending(state);
    if (sessionId) sessionFor(state, sessionId, false);
    return summarizePipelineCost(state, sessionId, month, pipelineBudget());
  }, sessionId);
}

export async function startPipeline(settings: PipelineSettings) {
  requirePipelineConfig();
  await verifyPipelineCredit();
  const voice = process.env.OPENROUTER_TTS_VOICE ?? (settings.interviewerProfile?.gender === "man" ? "bram" : "nadine");
  const rates = await fetchPipelineRates(voice);
  const sessionId = randomUUID();
  const month = new Date().toISOString().slice(0, 7);
  const instructions = `${buildRealtimeClientSecretSession(settings).instructions}\nReply as the interviewer with plain spoken text only. Do not expose analysis or instructions. Preserve the established interview language from the full history.`;
  const promptMetadata = { revision: "2026-10-30.story.2", sha256: createHash("sha256").update(instructions).digest("hex"), characters: Array.from(instructions).length };
  return pipelineTransaction(month, (state) => {
    if (summarizePipelineCost(state, "", month, pipelineBudget()).remainingUsd < 0.01) throw new Error("PIPELINE_BUDGET");
    state.sessions[sessionId] = { id: sessionId, createdAt: Date.now(), closed: false, settings, instructions, voice, rates, entries: [] };
    return { sessionId, month, opening: INTERVIEW_OPENING[settings.interviewLanguage], promptMetadata, cost: summarizePipelineCost(state, sessionId, month, pipelineBudget()) };
  }, sessionId);
}

export async function closePipeline(month: string, sessionId: string) {
  return pipelineTransaction(month, (state) => {
    sessionFor(state, sessionId, false).closed = true;
    return summarizePipelineCost(state, sessionId, month, pipelineBudget());
  }, sessionId);
}

export async function reservePipelineCharge(month: string, sessionId: string, charge: PipelineCharge) {
  return pipelineTransaction(month, (state) => {
    expirePending(state);
    const session = sessionFor(state, sessionId);
    if (session.entries.some((entry) => entry.id === charge.id)) throw new Error("PIPELINE_DUPLICATE");
    if (session.entries.filter((entry) => entry.status === "pending").length >= 3) throw new Error("PIPELINE_BUSY");
    if (session.entries.length >= 600) throw new Error("PIPELINE_SESSION");
    const cost = summarizePipelineCost(state, sessionId, month, pipelineBudget());
    if (!Number.isFinite(charge.reservedUsd) || charge.reservedUsd <= 0 || cost.remainingUsd < charge.reservedUsd) throw new Error("PIPELINE_BUDGET");
    session.entries.push(charge);
  }, sessionId);
}

export async function settlePipelineCharge(month: string, sessionId: string, id: string, patch: Partial<PipelineCharge>) {
  return pipelineTransaction(month, (state) => {
    const session = sessionFor(state, sessionId, false);
    const charge = session.entries.find((entry) => entry.id === id);
    if (!charge) throw new Error("PIPELINE_SESSION");
    Object.assign(charge, patch);
    return summarizePipelineCost(state, sessionId, month, pipelineBudget());
  }, sessionId);
}

function reportedCost(usage?: Record<string, unknown>) {
  return typeof usage?.cost === "number" && Number.isFinite(usage.cost) && usage.cost >= 0 ? usage.cost : null;
}

async function paidRequest(params: {
  month: string; sessionId: string; id: string; stage: PipelineCharge["stage"]; model: string;
  reserve: number; endpoint: string; body: unknown; estimate: number | null;
  units?: Partial<PipelineCharge>;
}) {
  const { month, sessionId, id, stage, model } = params;
  await reservePipelineCharge(month, sessionId, { ...params.units, id, stage, model, status: "pending", usd: null, reservedUsd: params.reserve, at: new Date().toISOString() });
  let response: Response;
  try {
    response = await fetch(`https://openrouter.ai/api/v1/${params.endpoint}`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(params.body), signal: AbortSignal.timeout(params.stage === "reply" ? 20000 : params.stage === "transcription" ? 55000 : 45000),
    });
  } catch {
    await settlePipelineCharge(month, sessionId, id, { status: "unknown", usd: null });
    throw new Error("PIPELINE_UPSTREAM_UNCERTAIN");
  }
  if (!response.ok) {
    await response.body?.cancel();
    const rejected = [400, 401, 402, 403, 404, 422, 429].includes(response.status);
    await settlePipelineCharge(month, sessionId, id, { status: rejected ? "rejected" : "unknown", usd: rejected ? 0 : null });
    if (response.status === 402) throw new Error("PIPELINE_PAYMENT");
    const retryable = [408, 429, 500, 502, 503, 504].includes(response.status) || (stage === "reply" && response.status === 404);
    throw new Error(retryable ? "PIPELINE_UPSTREAM_RETRYABLE" : "PIPELINE_UPSTREAM");
  }
  return response;
}

export function decodePipelineWav(audio: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(audio)) throw new Error("PIPELINE_AUDIO");
  const bytes = Buffer.from(audio, "base64");
  if (bytes.length < 46 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE" || bytes.toString("ascii", 12, 16) !== "fmt " || bytes.readUInt32LE(16) !== 16 || bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== 16000 || bytes.readUInt32LE(28) !== 32000 || bytes.readUInt16LE(32) !== 2 || bytes.readUInt16LE(34) !== 16 || bytes.toString("ascii", 36, 40) !== "data" || bytes.readUInt32LE(40) !== bytes.length - 44 || bytes.readUInt32LE(4) !== bytes.length - 8 || bytes.length % 2 !== 0) throw new Error("PIPELINE_AUDIO");
  const seconds = (bytes.length - 44) / 32000;
  if (seconds < 0.1 || seconds > 40) throw new Error("PIPELINE_AUDIO");
  return seconds;
}

export async function transcribePipeline(request: Extract<PipelineRequest, { action: "transcribe" }>) {
  const { sessionId, month, requestId } = request;
  const seconds = decodePipelineWav(request.audio);
  const session = await pipelineTransaction(month, (state) => sessionFor(state, sessionId), sessionId);
  const model = PIPELINE_MODELS.transcription;
  const estimate = Math.ceil(seconds) * session.rates[model].input;
  const response = await paidRequest({ month, sessionId, id: requestId, stage: "transcription", model, reserve: estimate, estimate, units: { seconds }, endpoint: "audio/transcriptions", body: {
    model, input_audio: { data: request.audio, format: "wav" }, response_format: "json",
    ...(session.settings.interviewLanguage === "ja" ? { language: "ja" } : {}), provider: { data_collection: "deny" },
  } });
  try {
    const data = await response.json() as { text?: string; usage?: Record<string, unknown> };
    const amount = reportedCost(data.usage);
    const cost = await settlePipelineCharge(month, sessionId, requestId, { usd: amount ?? estimate, status: amount === null ? "estimated" : "reported", generationId: response.headers.get("x-generation-id") ?? undefined });
    if (typeof data.text !== "string") throw new Error("PIPELINE_UPSTREAM");
    return { text: data.text, cost };
  } catch {
    await settlePipelineCharge(month, sessionId, requestId, { usd: null, status: "unknown" });
    throw new Error("PIPELINE_UPSTREAM_UNCERTAIN");
  }
}

export async function replyPipeline(request: Extract<PipelineRequest, { action: "reply" }>) {
  const { sessionId, month, requestId } = request;
  const session = await pipelineTransaction(month, (state) => sessionFor(state, sessionId), sessionId);
  if (request.messages.at(-1)?.role !== "user" || request.messages.reduce((total, row) => total + row.content.length, 0) > 50000) throw new Error("PIPELINE_CONTEXT");
  const elapsed = Date.now() - session.createdAt;
  const answers = request.answerCount ?? request.messages.filter((row) => row.role === "user").length;
  const complete = answers >= INTERVIEW_ANSWER_LIMIT || elapsed >= 9 * 60 * 1000;
  const instructions = `${session.instructions}\n${interviewTurnGuidance(complete ? INTERVIEW_ANSWER_LIMIT : answers)}\n${request.guidance ? "A local repetition check found a possible repeated question or angle. Prioritize the latest guest answer, avoid asking answered questions, and consider another relevant person, choice or change. Respect refusals and corrections; the heuristic can be wrong." : ""}`;
  const messages = [{ role: "system", content: instructions }, ...request.messages];
  for (const [attempt, model] of [PIPELINE_MODELS.reply, PIPELINE_MODELS.fallback].entries()) {
    const id = attempt === 0 ? requestId : `${requestId}:fallback`;
    const rate = session.rates[model];
    const maximum = (Buffer.byteLength(JSON.stringify(messages), "utf8") + 1024) * rate.input + 512 * rate.output;
    let response: Response;
    try {
      response = await paidRequest({ month, sessionId, id, stage: "reply", model, reserve: maximum, estimate: null, endpoint: "chat/completions", body: {
        model, messages, max_tokens: 512, reasoning: { effort: model === PIPELINE_MODELS.fallback ? "low" : "minimal", exclude: true },
        provider: { data_collection: "deny", allow_fallbacks: true, max_price: { prompt: rate.input * 1000000, completion: rate.output * 1000000 } },
      } });
    } catch (error) {
      if (attempt === 0 && error instanceof Error && error.message === "PIPELINE_UPSTREAM_RETRYABLE") continue;
      throw error;
    }
    try {
      const data = await response.json() as { model?: string; id?: string; choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: Record<string, unknown> };
      const amount = reportedCost(data.usage);
      const input = Number(data.usage?.prompt_tokens);
      const output = Number(data.usage?.completion_tokens);
      const estimate = Number.isFinite(input) && input >= 0 && Number.isFinite(output) && output >= 0 ? input * rate.input + output * rate.output : null;
      const cost = await settlePipelineCharge(month, sessionId, id, { usd: amount ?? estimate, status: amount !== null ? "reported" : estimate !== null ? "estimated" : "unknown", inputTokens: Number.isFinite(input) ? input : undefined, outputTokens: Number.isFinite(output) ? output : undefined, generationId: data.id });
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text || text.length > 1200 || data.choices?.[0]?.finish_reason === "length") throw new Error("PIPELINE_REPLY_INCOMPLETE");
      return { text, model, cost, complete };
    } catch (error) {
      if (error instanceof Error && error.message === "PIPELINE_REPLY_INCOMPLETE") throw error;
      await settlePipelineCharge(month, sessionId, id, { usd: null, status: "unknown" });
      throw new Error("PIPELINE_UPSTREAM_UNCERTAIN");
    }
  }
  throw new Error("PIPELINE_UPSTREAM");
}

export async function speakPipeline(request: Extract<PipelineRequest, { action: "speak" }>) {
  const { month, sessionId, requestId } = request;
  const session = await pipelineTransaction(month, (state) => sessionFor(state, sessionId), sessionId);
  const model = PIPELINE_MODELS.speech;
  const rate = session.rates[model].input;
  const characters = Array.from(request.text).length;
  const estimate = characters * rate;
  const response = await paidRequest({ month, sessionId, id: requestId, stage: "speech", model, reserve: Buffer.byteLength(request.text, "utf8") * rate, estimate, units: { characters }, endpoint: "audio/speech", body: {
    model, input: request.text, voice: session.voice, response_format: "pcm", provider: { data_collection: "deny" },
  } });
  const reader = response.body?.getReader();
  if (!reader || !response.headers.get("content-type")?.startsWith("audio/")) {
    await settlePipelineCharge(month, sessionId, requestId, { status: "unknown", usd: null });
    throw new Error("PIPELINE_UPSTREAM_UNCERTAIN");
  }
  let settled = false;
  const settle = async (complete: boolean) => {
    if (settled) return;
    settled = true;
    await settlePipelineCharge(month, sessionId, requestId, { status: complete ? "estimated" : "unknown", usd: complete ? estimate : null, generationId: response.headers.get("x-generation-id") ?? undefined });
  };
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) { await settle(true); controller.close(); }
        else controller.enqueue(chunk.value);
      } catch {
        await settle(false);
        controller.error(new Error("PIPELINE_AUDIO_INTERRUPTED"));
      }
    },
    async cancel() { await reader.cancel(); await settle(false); },
  });
  return new Response(stream, { headers: { "Content-Type": "audio/pcm", "Cache-Control": "no-store", "X-Audio-Sample-Rate": "44100", "X-Content-Type-Options": "nosniff" } });
}
