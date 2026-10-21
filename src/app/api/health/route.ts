import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health/checks";

export async function GET() {
  const report = await runHealthChecks();
  const hasError =
    report.supabase.status === "error" ||
    report.storage.status === "error" ||
    report.openai.status === "error";
  return NextResponse.json(report, { status: hasError ? 503 : 200 });
}
