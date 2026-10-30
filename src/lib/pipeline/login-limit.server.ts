import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function consumeOperatorAttempt(request: Request, now = Date.now()) {
  const address = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : "local";
  const scope = createHash("sha256").update(address ?? "unknown").digest("hex");
  if (isSupabaseConfigured()) {
    const result = await getServiceRoleClient().rpc("pipeline_operator_attempt", { p_scope: scope });
    if (result.error || typeof result.data !== "boolean") throw new Error("PIPELINE_STORAGE");
    return result.data;
  }
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.INTERVIEW_USAGE_STORE !== "file")) throw new Error("PIPELINE_STORAGE_CONFIG");
  const directory = process.env.NODE_ENV !== "production" && process.env.INTERVIEW_USAGE_DIR ? process.env.INTERVIEW_USAGE_DIR : path.join(process.cwd(), "private-usage");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, "operator-attempts.lock");
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { await mkdir(lock); acquired = true; break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!acquired) throw new Error("PIPELINE_STORAGE_BUSY");
  const filename = path.join(directory, "operator-attempts.json");
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    let state: { expires: number; count: number } = { expires: now + 15 * 60 * 1000, count: 0 };
    try { state = JSON.parse(await readFile(filename, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (!Number.isFinite(state.expires) || !Number.isInteger(state.count) || state.count < 0) throw new Error("PIPELINE_STORAGE");
    if (state.expires <= now) state = { expires: now + 15 * 60 * 1000, count: 0 };
    const allowed = state.count < 5;
    if (allowed) state.count += 1;
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, filename);
    return allowed;
  } finally {
    await rm(temporary, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
