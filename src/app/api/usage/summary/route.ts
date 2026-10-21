import { NextResponse } from "next/server";
import { buildUsageSummary } from "@/lib/usage/summary";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const summary = await buildUsageSummary(sessionId);
  return NextResponse.json(summary);
}
