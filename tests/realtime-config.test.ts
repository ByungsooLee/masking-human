import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REALTIME_MODEL,
  getRealtimeModel,
  REALTIME_SESSION_DURATION_MS,
} from "@/lib/realtime/config";

describe("getRealtimeModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults when OPENAI_REALTIME_MODEL is unset", () => {
    vi.stubEnv("OPENAI_REALTIME_MODEL", "");
    expect(getRealtimeModel()).toBe(DEFAULT_REALTIME_MODEL);
  });

  it("uses OPENAI_REALTIME_MODEL when set (e.g. mini for cost tests)", () => {
    vi.stubEnv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini");
    expect(getRealtimeModel()).toBe("gpt-realtime-mini");
  });
});

describe("REALTIME_SESSION_DURATION_MS", () => {
  it("is 10 minutes", () => {
    expect(REALTIME_SESSION_DURATION_MS).toBe(600_000);
  });
});
