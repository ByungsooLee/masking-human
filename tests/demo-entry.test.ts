import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/graph/thought-graph", () => ({ ThoughtGraph: () => null }));
vi.mock("@/hooks/use-mic-level", () => ({ useMicLevel: vi.fn(() => ({ denied: false, hearing: false, level: 0 })) }));
vi.mock("@/hooks/use-live-consent-session", () => ({ useLiveConsentSession: () => ({ grantConsents: vi.fn() }) }));
vi.mock("@/contexts/recording-session-context", () => ({ useRecordingSession: () => ({ unlockAudio: vi.fn() }) }));

import { PhasePrepare } from "@/components/magazine-flow/phase-prepare";
import { useMicLevel } from "@/hooks/use-mic-level";

describe("demo entry", () => {
  it("shows a directly usable demo button on the demo-only URL without requesting a microphone", () => {
    const html = renderToStaticMarkup(createElement(PhasePrepare, { mockOnly: true, onStartDemo: vi.fn() }));
    expect(html).toContain("デモの会話で試す");
    expect(html).toContain("用意した会話");
    expect(html).not.toContain("同期合図のあと会話を始める");
    expect(useMicLevel).toHaveBeenLastCalledWith(false);
  });
  it("keeps both live and demo entry points on the normal URL", () => {
    const html = renderToStaticMarkup(createElement(PhasePrepare, { mockOnly: false, onStartDemo: vi.fn() }));
    expect(html).toContain("デモの会話で試す");
    expect(html).toContain("同期合図のあと会話を始める");
  });
});
