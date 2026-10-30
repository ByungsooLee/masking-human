import { NextResponse } from "next/server";
import { OPERATOR_COOKIE, operatorCookieValue, publicOrigin, sameOrigin, validOperatorPassword } from "@/lib/pipeline/auth.server";
import { requirePipelineConfig } from "@/lib/pipeline/config.server";
import { consumeOperatorAttempt } from "@/lib/pipeline/login-limit.server";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return NextResponse.json({ error: "PIPELINE_ORIGIN" }, { status: 403, headers });
  try {
    requirePipelineConfig();
    if (!await consumeOperatorAttempt(request)) return NextResponse.json({ error: "PIPELINE_RATE_LIMIT" }, { status: 429, headers: { ...headers, "Retry-After": "900" } });
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 400, headers });
    const body = JSON.parse(text) as { password?: unknown };
    if (typeof body.password !== "string" || !validOperatorPassword(body.password)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 401, headers });
    }
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(OPERATOR_COOKIE, operatorCookieValue(), { httpOnly: true, sameSite: "strict", secure: publicOrigin(request).startsWith("https:"), maxAge: 8 * 60 * 60, path: "/api" });
    return response;
  } catch { return NextResponse.json({ error: "PIPELINE_CONFIGURATION" }, { status: 503, headers }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "PIPELINE_ORIGIN" }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(OPERATOR_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: publicOrigin(request).startsWith("https:"), maxAge: 0, path: "/api" });
  return response;
}
