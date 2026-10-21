import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearSttIdempotencyForTests,
  getSttIdempotency,
  setSttIdempotency,
} from "@/lib/voice/stt-idempotency";

describe("STT idempotency (memory fallback)", () => {
  beforeEach(() => {
    process.env.SESSION_STORE = "memory";
    clearSttIdempotencyForTests();
  });

  it("returns same payload for duplicate clientSttId", async () => {
    const sessionId = randomUUID();
    const clientSttId = randomUUID();
    const payload = {
      text: "hello",
      utteranceId: randomUUID(),
      audioAssetId: randomUUID(),
      language: "en",
    };
    await setSttIdempotency(sessionId, clientSttId, payload);
    const cached = await getSttIdempotency(sessionId, clientSttId);
    expect(cached).toEqual(payload);
  });
});
