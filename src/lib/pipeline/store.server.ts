import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PipelineMonth } from "./types";

export async function pipelineTransaction<Result>(month: string, update: (state: PipelineMonth) => Result, sessionId = ""): Promise<Result> {
  if (!/^\d{4}-\d{2}$/u.test(month)) throw new Error("PIPELINE_SESSION");
  if (isSupabaseConfigured()) {
    const client = getServiceRoleClient();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const current = await client.rpc("pipeline_read_costs", { p_month: month, p_session_id: sessionId });
      if (current.error) throw new Error("PIPELINE_STORAGE");
      const state = current.data.payload as PipelineMonth;
      const before = JSON.stringify(state);
      const result = update(state);
      if (JSON.stringify(state) === before) return result;
      if (!sessionId || !state.sessions[sessionId]) throw new Error("PIPELINE_STORAGE");
      const saved = await client.rpc("pipeline_commit_costs", { p_month: month, p_session_id: sessionId, p_revision: current.data.revision, p_payload: state.sessions[sessionId] });
      if (saved.error) throw new Error("PIPELINE_STORAGE");
      if (saved.data === true) return result;
    }
    throw new Error("PIPELINE_STORAGE_BUSY");
  }
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.INTERVIEW_USAGE_STORE !== "file")) throw new Error("PIPELINE_STORAGE_CONFIG");
  const directory = process.env.NODE_ENV !== "production" && process.env.INTERVIEW_USAGE_DIR
    ? path.normalize(process.env.INTERVIEW_USAGE_DIR)
    : path.join(process.cwd(), "private-usage");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, `${month}.lock`);
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { await mkdir(lock); acquired = true; break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw new Error("PIPELINE_STORAGE");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!acquired) throw new Error("PIPELINE_STORAGE_BUSY");
  const filename = path.join(directory, `${month}.json`);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    let state: PipelineMonth = { sessions: {} };
    try { state = JSON.parse(await readFile(filename, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("PIPELINE_STORAGE"); }
    const result = update(state);
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, filename);
    return result;
  } finally {
    await rm(temporary, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
