import { describe, expect, it } from "vitest";
import { resolveWorkspaceView } from "@/lib/graph/workspace-view";

describe("responsive conversation views", () => {
  it("defaults to chat instead of both on mobile", () => {
    expect(resolveWorkspaceView("both", true)).toBe("chat");
  });
  it("keeps either selected single panel on mobile", () => {
    expect(resolveWorkspaceView("chat", true)).toBe("chat");
    expect(resolveWorkspaceView("map", true)).toBe("map");
  });
  it("retains the desktop preference when moving back to a wide viewport", () => {
    expect(resolveWorkspaceView("both", false)).toBe("both");
    expect(resolveWorkspaceView("map", false)).toBe("map");
    expect(resolveWorkspaceView("chat", false)).toBe("chat");
  });
});
