import { NextResponse } from "next/server";
import { dailyTotalsLastDays, listSessions } from "@/lib/usage/session-usage-store";

export async function GET() {
  const sessions = listSessions().map(({ patchToken: _token, ...session }) => session);
  return NextResponse.json({
    sessions,
    dailyTotals: dailyTotalsLastDays(14),
  });
}
