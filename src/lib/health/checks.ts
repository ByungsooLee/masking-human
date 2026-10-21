import OpenAI from "openai";
import { getAnonClient, getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AUDIO_BUCKET } from "@/lib/voice/audio-limits";

export type HealthStatus = "ok" | "degraded" | "skipped" | "error";

export interface HealthReport {
  sessionStore: string;
  supabase: { status: HealthStatus; detail?: string };
  storage: { status: HealthStatus; detail?: string };
  openai: { status: HealthStatus; detail?: string };
}

export async function runHealthChecks(): Promise<HealthReport> {
  const sessionStore = process.env.SESSION_STORE?.toLowerCase() ?? "memory";
  const report: HealthReport = {
    sessionStore,
    supabase: { status: "skipped" },
    storage: { status: "skipped" },
    openai: { status: "skipped" },
  };

  if (isSupabaseConfigured()) {
    try {
      const client = getServiceRoleClient();
      const { error } = await client.from("participants").select("id").limit(1);
      report.supabase = error
        ? { status: "error", detail: "participants query failed" }
        : { status: "ok" };
      const { data: buckets, error: bErr } = await client.storage.listBuckets();
      if (bErr) {
        report.storage = { status: "error", detail: "listBuckets failed" };
      } else {
        const found = buckets?.some((b) => b.name === AUDIO_BUCKET);
        report.storage = found
          ? { status: "ok" }
          : { status: "degraded", detail: `bucket ${AUDIO_BUCKET} missing` };
      }
      const anon = getAnonClient();
      if (anon) {
        const { error: anonErr } = await anon.from("interview_sessions").select("id").limit(1);
        report.supabase.detail = anonErr ? "anon+RLS active" : "anon readable (check RLS)";
      }
    } catch {
      report.supabase = { status: "error", detail: "client init failed" };
    }
  }

  const key = process.env.OPENAI_API_KEY;
  if (key && process.env.HEALTH_CHECK_OPENAI === "1") {
    try {
      const client = new OpenAI({ apiKey: key });
      await client.models.list();
      report.openai = { status: "ok" };
    } catch {
      report.openai = { status: "error", detail: "models.list failed" };
    }
  } else if (key) {
    report.openai = { status: "skipped", detail: "set HEALTH_CHECK_OPENAI=1 to probe" };
  }

  return report;
}
