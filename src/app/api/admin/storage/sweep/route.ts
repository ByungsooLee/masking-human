import { NextResponse } from "next/server";
import { sweepOrphanAssets } from "@/lib/voice/storage-cleanup";

export async function POST(request: Request) {
  const key = process.env.ADMIN_API_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!key || provided !== key) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const result = await sweepOrphanAssets(sessionId);
  return NextResponse.json(result);
}
