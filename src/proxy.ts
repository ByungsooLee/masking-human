import { NextResponse, type NextRequest } from "next/server";
import { isDemoOnly } from "@/lib/demo-mode";
import { operatorAuthorized, sameOrigin } from "@/lib/pipeline/auth.server";

export function proxy(request?: NextRequest) {
  if (isDemoOnly()) {
    return NextResponse.json(
      { error: "DEMO_ONLY", message: "All server APIs are disabled in this demo." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (request && ["/api/admin/deletion/process", "/api/admin/storage/sweep"].includes(request.nextUrl.pathname)) return NextResponse.next();
  if (process.env.VERCEL && !process.env.INTERVIEW_OPERATOR_PASSWORD && request?.nextUrl.pathname !== "/api/health") {
    return NextResponse.json({ error: "PIPELINE_CONFIGURATION" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (process.env.INTERVIEW_OPERATOR_PASSWORD && request && !["/api/pipeline/operator", "/api/health"].includes(request.nextUrl.pathname)) {
    if (!operatorAuthorized(request) || (request.method !== "GET" && !sameOrigin(request))) return NextResponse.json({ error: "PIPELINE_AUTH" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.next();
}

// Deny every API, including future routes, before handlers can run.
export const config = { matcher: "/api/:path*" };
