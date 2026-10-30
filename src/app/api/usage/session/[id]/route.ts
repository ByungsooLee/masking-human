import { NextResponse } from "next/server";
import { normalizeRealtimeUsage, type RawRealtimeUsage } from "@/lib/usage/normalize-usage";
import {
  endSession,
  getSessionRecord,
  mergeSessionUsageDelta,
  updateSessionUsage,
} from "@/lib/usage/session-usage-store";
import { authorizeSessionPatch } from "@/lib/usage/authorize-session-patch";
import { estimateUsdFromSnapshot } from "@/lib/usage/estimate-cost";

type PatchBody = {
  usage?: RawRealtimeUsage;
  responseId?: string;
  ended?: boolean;
};

export async function PATCH(req: Request, ctx: RouteContext<"/api/usage/session/[id]">) {
  const { id } = await ctx.params;
  const existing = getSessionRecord(id);
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!authorizeSessionPatch(req, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.usage) {
    const delta = normalizeRealtimeUsage(body.usage);
    mergeSessionUsageDelta(id, delta, typeof body.responseId === "string" ? body.responseId : undefined);
  }

  if (body.ended) {
    endSession(id);
  }

  const record = getSessionRecord(id);
  if (record && body.usage) {
    const estimatedUsd = estimateUsdFromSnapshot(record.model, record.usage);
    updateSessionUsage(id, { estimatedUsd });
  }

  const updated = getSessionRecord(id) ?? record;
  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const { patchToken: _token, ...session } = updated;
  return NextResponse.json({ session });
}
