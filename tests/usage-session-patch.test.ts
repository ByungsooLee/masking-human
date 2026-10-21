import { describe, expect, it } from "vitest";
import { authorizeSessionPatch } from "@/lib/usage/authorize-session-patch";
import { clearSessionUsageStoreForTests, createSessionRecord } from "@/lib/usage/session-usage-store";

describe("usage session PATCH auth", () => {
  it("requires the patch token issued at session creation", () => {
    clearSessionUsageStoreForTests();
    const record = createSessionRecord({ model: "gpt-realtime-2.1-mini" });
    const ok = new Request(`http://local/api/usage/session/${record.sessionId}`, {
      method: "PATCH",
      headers: { "X-Usage-Patch-Token": record.patchToken },
    });
    const bad = new Request(`http://local/api/usage/session/${record.sessionId}`, {
      method: "PATCH",
      headers: { "X-Usage-Patch-Token": "wrong" },
    });
    expect(authorizeSessionPatch(ok, record.sessionId)).toBe(true);
    expect(authorizeSessionPatch(bad, record.sessionId)).toBe(false);
  });
});
