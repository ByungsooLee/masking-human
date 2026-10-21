import { NextResponse } from "next/server";
import { dailyTotalsLastDays, listSessions } from "@/lib/usage/session-usage-store";

export async function GET() {
  return NextResponse.json({
    sessions: listSessions(),
    dailyTotals: dailyTotalsLastDays(14),
  });
}
