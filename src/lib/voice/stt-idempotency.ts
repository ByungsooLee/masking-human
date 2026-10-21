import { getServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface SttIdempotencyPayload {
  text: string;
  utteranceId: string;
  audioAssetId: string;
  language: string;
}

const memory = globalThis as unknown as {
  sttIdempotency?: Map<string, SttIdempotencyPayload>;
};

function memKey(sessionId: string, clientSttId: string) {
  return `${sessionId}:${clientSttId}`;
}

export async function getSttIdempotency(
  sessionId: string,
  clientSttId: string,
): Promise<SttIdempotencyPayload | null> {
  if (
    process.env.SESSION_STORE?.toLowerCase() === "supabase" &&
    isSupabaseConfigured()
  ) {
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("stt_idempotency")
      .select("response_json")
      .eq("session_id", sessionId)
      .eq("client_stt_id", clientSttId)
      .maybeSingle();
    if (error) throw error;
    return (data?.response_json as SttIdempotencyPayload) ?? null;
  }
  if (!memory.sttIdempotency) memory.sttIdempotency = new Map();
  return memory.sttIdempotency.get(memKey(sessionId, clientSttId)) ?? null;
}

export async function setSttIdempotency(
  sessionId: string,
  clientSttId: string,
  payload: SttIdempotencyPayload,
): Promise<void> {
  if (
    process.env.SESSION_STORE?.toLowerCase() === "supabase" &&
    isSupabaseConfigured()
  ) {
    const client = getServiceRoleClient();
    const { error } = await client.from("stt_idempotency").upsert(
      {
        session_id: sessionId,
        client_stt_id: clientSttId,
        response_json: payload,
      },
      { onConflict: "session_id,client_stt_id" },
    );
    if (error) throw error;
    return;
  }
  if (!memory.sttIdempotency) memory.sttIdempotency = new Map();
  memory.sttIdempotency.set(memKey(sessionId, clientSttId), payload);
}

export function clearSttIdempotencyForTests(): void {
  memory.sttIdempotency?.clear();
}
