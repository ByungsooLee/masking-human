import { NextResponse } from "next/server";
import { getRealtimeModel } from "@/lib/realtime/config";
import { createSessionRecord } from "@/lib/usage/session-usage-store";

export async function POST(req: Request) {
  let isMock = false;
  try {
    const body = (await req.json()) as { isMock?: boolean };
    isMock = body.isMock === true;
  } catch {
    /* default live tracking from /api/session */
  }

  const record = createSessionRecord({
    model: getRealtimeModel(),
    isMock,
  });

  return NextResponse.json({ sessionId: record.sessionId });
}
