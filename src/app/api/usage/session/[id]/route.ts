import { NextResponse } from "next/server";
import { normalizeRealtimeUsage, type RawRealtimeUsage } from "@/lib/usage/normalize-usage";
import {
  endSession,
  getSessionRecord,
  mergeSessionUsageDelta,
  updateSessionUsage,
} from "@/lib/usage/session-usage-store";
import { estimateUsdFromSnapshot } from "@/lib/usage/estimate-cost";
import { emptyUsageSnapshot } from "@/lib/usage/normalize-usage";

type PatchBody = {
  usage?: RawRealtimeUsage;
  estimatedUsd?: number;
  ended?: boolean;
};

export async function PATCH(req: Request, ctx: RouteContext<"/api/usage/session/[id]">) {
  const { id } = await ctx.params;
  const existing = getSessionRecord(id);
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.usage) {
    const delta = normalizeRealtimeUsage(body.usage);
    mergeSessionUsageDelta(id, delta);
  }

  if (typeof body.estimatedUsd === "number") {
    updateSessionUsage(id, { estimatedUsd: body.estimatedUsd });
  }

  if (body.ended) {
    endSession(id);
  }

  const record = getSessionRecord(id);
  if (record && body.usage && typeof body.estimatedUsd !== "number") {
    const estimatedUsd = estimateUsdFromSnapshot(record.model, record.usage);
    updateSessionUsage(id, { estimatedUsd });
  }

  return NextResponse.json({ session: getSessionRecord(id) ?? record });
}
