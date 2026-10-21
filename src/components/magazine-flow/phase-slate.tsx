"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ThoughtGraph } from "@/components/graph/thought-graph";
import { buildConversationGraph } from "@/lib/graph/build-conversation-graph";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { getMockConversationDurationMs } from "@/lib/realtime/mock-conversation";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

type Props = { mockOnly: boolean };

const LINE_GAP_MS = 380;

export function PhaseSlate({ mockOnly }: Props) {
  const ui = getMagazineFlowUi();
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const setRecordingSlateAtMs = useMagazineFlowStore((s) => s.setRecordingSlateAtMs);
  const recorder = useRecordingSession();
  const started = useRef(false);
  const [lines, setLines] = useState(0);
  const [flash, setFlash] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const bootLines = [ui.bootLineVoice, ui.bootLineMic, ui.bootLineSlate];
  const graph = useMemo(() => buildConversationGraph([], lines * 2), [lines]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    void (async () => {
      for (let i = 1; i <= 3; i++) {
        setLines(i);
        await wait(LINE_GAP_MS);
      }
      if (mockOnly) {
        const ok = await recorder.startMockSilent(getMockConversationDurationMs() + 2000, true);
        if (!ok) {
          setBlocked(ui.slateRecordingFailed);
          return;
        }
        setRecordingSlateAtMs(recorder.clock.elapsedMs() > 0 ? 300 : 0);
      } else {
        const ok = await recorder.startWithSlate({
          includeCamera: prepare.includeCamera,
          playBeep: true,
        });
        if (!ok) {
          setBlocked(ui.slateRecordingFailed);
          return;
        }
        setRecordingSlateAtMs(recorder.slateAtMs ?? recorder.clock.elapsedMs());
      }
      setFlash(true);
      await wait(450);
      setPhase("conversation");
    })();
  }, [mockOnly, prepare.includeCamera, recorder, setPhase, setRecordingSlateAtMs]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-6 px-[var(--space-page-x)] py-[var(--space-page-y)]">
      <div className="h-[min(46vh,22rem)] w-[min(86vw,28rem)]">
        <ThoughtGraph graph={graph} mode="boot" className="h-full w-full" />
      </div>
      <ul className="flex min-h-[6em] flex-col gap-1 text-[length:var(--text-body)]" aria-live="polite">
        {blocked && (
        <div className="flex flex-col items-center gap-4">
          <p className="max-w-[24em] text-center text-[color:var(--color-rose)]" role="alert">
            {blocked}
          </p>
          <button type="button" className="ui-btn-sub" onClick={() => setPhase("prepare")}>
            {ui.back}
          </button>
        </div>
      )}
      {bootLines.slice(0, lines).map((line, i) => (
          <li key={line} className={`ui-line-in ${i === lines - 1 ? "text-[color:var(--color-rose)]" : "text-[color:var(--color-ink-muted)]"}`}>
            {line}
          </li>
        ))}
      </ul>
      {flash && <div className="ui-flash pointer-events-none fixed inset-0 z-50" aria-hidden />}
    </div>
  );
}
