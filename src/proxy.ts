import { NextResponse } from "next/server";
import { isDemoOnly } from "@/lib/demo-mode";

export function proxy() {
  if (isDemoOnly()) {
    return NextResponse.json(
      { error: "DEMO_ONLY", message: "All server APIs are disabled in this demo." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.next();
}

// Deny every API, including future routes, before handlers can run.
export const config = { matcher: "/api/:path*" };
