import { NextResponse } from "next/server";
import { operatorAuthorized, sameOrigin } from "@/lib/pipeline/auth.server";
import { closePipeline, pipelineCost, PipelineRequestSchema, replyPipeline, speakPipeline, startPipeline, transcribePipeline } from "@/lib/pipeline/service.server";
import { requirePipelineConfig, verifyPipelineCredit } from "@/lib/pipeline/config.server";

const headers = { "Cache-Control": "no-store" };
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const code = error instanceof Error && /^PIPELINE_[A-Z_]+$/u.test(error.message) ? error.message : "PIPELINE_STORAGE";
  const status = ["PIPELINE_BUDGET", "PIPELINE_CREDITS", "PIPELINE_KEY_LIMIT", "PIPELINE_PAYMENT"].includes(code) ? 402 : code === "PIPELINE_DUPLICATE" || code === "PIPELINE_BUSY" ? 409 : ["PIPELINE_AUDIO", "PIPELINE_CONTEXT", "PIPELINE_SESSION"].includes(code) ? 400 : 503;
  return NextResponse.json({ error: code }, { status, headers });
}

export async function GET(request: Request) {
  if (!operatorAuthorized(request)) return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 401, headers });
  try {
    const url = new URL(request.url);
    const preflight = url.searchParams.get("preflight") === "1" ? await verifyPipelineCredit() : undefined;
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const sessionId = url.searchParams.get("sessionId") ?? "";
    if (sessionId && !/^[a-f0-9-]{36}$/u.test(sessionId)) throw new Error("PIPELINE_SESSION");
    return NextResponse.json({ cost: await pipelineCost(month, sessionId), preflight }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (!operatorAuthorized(request) || !sameOrigin(request)) return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 401, headers });
  try {
    requirePipelineConfig();
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "PIPELINE_REQUEST" }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2000000) { await reader.cancel(); return NextResponse.json({ error: "PIPELINE_REQUEST" }, { status: 413, headers }); }
      chunks.push(chunk.value);
    }
    const parsed = PipelineRequestSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) return NextResponse.json({ error: "PIPELINE_REQUEST" }, { status: 400, headers });
    const body = parsed.data;
    if (body.action === "start") return NextResponse.json(await startPipeline(body.settings), { headers });
    if (body.action === "close") return NextResponse.json({ cost: await closePipeline(body.month, body.sessionId) }, { headers });
    if (body.action === "transcribe") return NextResponse.json(await transcribePipeline(body), { headers });
    if (body.action === "reply") return NextResponse.json(await replyPipeline(body), { headers });
    return await speakPipeline(body);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "PIPELINE_REQUEST" }, { status: 400, headers });
    return errorResponse(error);
  }
}
