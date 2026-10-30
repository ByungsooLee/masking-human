import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sessionId = "1807b162-f3c4-4f2a-883c-66ccfe000002";
const database = vi.hoisted(() => ({ revision: 0, payload: { id: "1807b162-f3c4-4f2a-883c-66ccfe000002", count: 0 }, conflicts: 0 }));
vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getServiceRoleClient: () => ({ rpc: async (name: string, params: { p_session_id: string; p_revision: number; p_payload: typeof database.payload }) => {
    if (name === "pipeline_read_costs") return { data: { revision: database.revision, payload: { sessions: { [params.p_session_id]: structuredClone(database.payload) }, other: { usd: 1, reservedUsd: 0.25, unknown: 1 } } }, error: null };
    if (params.p_revision !== database.revision) { database.conflicts += 1; return { data: false, error: null }; }
    database.revision += 1; database.payload = structuredClone(params.p_payload);
    return { data: true, error: null };
  } }),
}));
import { pipelineTransaction } from "@/lib/pipeline/store.server";

afterEach(() => { database.revision = 0; database.payload = { id: sessionId, count: 0 }; database.conflicts = 0; });

describe("shared monthly accounting", () => {
  it("retries revision conflicts without losing concurrent updates", async () => {
    await Promise.all(Array.from({ length: 8 }, () => pipelineTransaction("2026-10", (state) => {
      (state.sessions[sessionId] as unknown as typeof database.payload).count += 1;
    }, sessionId)));
    expect(database.payload.count).toBe(8);
    expect(database.revision).toBe(8);
    expect(database.conflicts).toBeGreaterThan(0);
  });
  it("does not write partial updates when a budget check rejects a transaction", async () => {
    await expect(pipelineTransaction("2026-10", (state) => {
      (state.sessions[sessionId] as unknown as typeof database.payload).count = 100;
      throw new Error("PIPELINE_BUDGET");
    }, sessionId)).rejects.toThrow("PIPELINE_BUDGET");
    expect(database.payload.count).toBe(0);
    expect(database.revision).toBe(0);
  });
  it("returns monthly totals alongside one session without rewriting read-only snapshots", async () => {
    const result = await pipelineTransaction("2026-10", (state) => state.other, sessionId);
    expect(result).toEqual({ usd: 1, reservedUsd: 0.25, unknown: 1 });
    expect(database.revision).toBe(0);
  });
});
