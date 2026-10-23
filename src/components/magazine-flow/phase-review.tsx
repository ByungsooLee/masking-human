"use client";

import { useMemo, useRef, useState } from "react";
import { FacetChips } from "@/components/graph/facet-chips";
import { FocusDetail } from "@/components/graph/focus-detail";
import { ThoughtGraph } from "@/components/graph/thought-graph";
import { buildConversationGraph } from "@/lib/graph/build-conversation-graph";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";
import { buildDraftFromTranscript } from "@/lib/magazine-flow/build-draft-from-transcript";
import { useRecordingSession } from "@/contexts/recording-session-context";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { activeTranscript } from "@/lib/magazine-flow/validate-guest-text";

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PhaseReview() {
  const ui = useMagazineFlowUi();
  const transcript = useMagazineFlowStore((s) => s.transcript);
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const updateTranscriptEntry = useMagazineFlowStore((s) => s.updateTranscriptEntry);
  const setDraft = useMagazineFlowStore((s) => s.setDraft);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const recorder = useRecordingSession();
  const slateAtMs = useMagazineFlowStore((s) => s.recordingSlateAtMs);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => activeTranscript(transcript), [transcript]);
  const graph = useMemo(() => buildConversationGraph(rows), [rows]);
  const depthOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.depth])), [graph]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const focus = selectedId && graph.nodes.some((n) => n.id === selectedId) ? selectedId : null;

  const related = useMemo(() => {
    if (!focus) return null;
    const ids = new Set([focus]);
    for (const e of graph.edges) {
      if (e.source === focus) ids.add(e.target);
      if (e.target === focus) ids.add(e.source);
    }
    return ids;
  }, [focus, graph]);

  const describe = (id: string) => {
    const u = rows.find((r) => r.id === id);
    if (!u) return null;
    const depth = depthOf.get(id);
    const time = formatTime(u.startedAt - (slateAtMs ?? 0));
    return { id, text: u.text, meta: depth != null ? `${time}　${ui.depthRings[depth]}` : time };
  };

  const seek = (startedAt: number, id: string) => {
    setActiveId(id);
    setSelectedId(id);
    const el = audioRef.current;
    if (!el || !recorder.blobUrl) return;
    el.currentTime = Math.max(0, startedAt / 1000);
    void el.play();
  };

  const buildPage = async () => {
    setBusy(true);
    setError(null);
    const draft = buildDraftFromTranscript(transcript, prepare);
    setBusy(false);
    setDraft(draft);
    setPhase("magazine");
  };

  return (
    <div className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)]">
      <p className="mb-4">{prepare.language === "ja" ? "ステップ1 / 3 — 含めたくない発言を選ぶ" : "Step 1 / 3 — Choose statements to exclude"}</p>
      <h1 className="ui-heading mb-[var(--space-block)]">{ui.reviewHeading}</h1>
      {recorder.blobUrl ? (
        <audio ref={audioRef} src={recorder.blobUrl} controls className="mb-6 w-full max-w-md" />
      ) : (
        <p className="mb-6 text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]">{ui.noRecording}</p>
      )}

      <p className="mb-6">{prepare.language === "ja" ? "文字起こしを確認してから、下の「分析結果を確認する」へ進んでください。発言は修正・除外できます。" : "Check the transcript, then continue to review your findings. You can correct or exclude statements."}</p>
      <details className="mb-[var(--space-block)]">
        <summary className="cursor-pointer">{prepare.language === "ja" ? "発言同士のつながりを見る" : "Explore conversation connections"}</summary>
      <section className="mt-4 flex flex-col gap-4 text-[length:var(--text-body)]">
        <div className="flex flex-col gap-1">
          <h2 className="text-[color:var(--color-ink)]">{ui.mapHeading}</h2>
          <p className="text-[color:var(--color-ink-muted)]">{ui.mapHint}</p>
        </div>
        <div className="grid gap-4 landscape:md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="ui-panel h-[min(60vh,32rem)] p-2">
            <ThoughtGraph
              graph={graph}
              mode="idle"
              ringLabels={ui.depthRings}
              selectedId={focus}
              onSelect={setSelectedId}
              className="h-full w-full"
            />
          </div>
          <div className="flex flex-col gap-4">
            <FacetChips nodes={graph.nodes} selectedId={focus} onSelect={setSelectedId} />
            <FocusDetail
              graph={graph}
              selectedId={focus}
              describe={describe}
              heading={ui.answersWithWord}
              onSelect={setSelectedId}
              renderAction={(id) => {
                const u = rows.find((r) => r.id === id);
                if (!u || !recorder.blobUrl) return null;
                return (
                  <button
                    type="button"
                    className="ui-num w-fit text-[color:var(--color-rose)] underline underline-offset-4"
                    onClick={() => seek(u.startedAt, u.id)}
                  >
                    {ui.playFrom(formatTime(u.startedAt - (slateAtMs ?? 0)))}
                  </button>
                );
              }}
            />
          </div>
        </div>
      </section>
      </details>

      <ul className="ui-thread flex max-w-[var(--content-max)] flex-col gap-3 text-[length:var(--text-body)]">
        {transcript.map((u) => (
          <li
            key={u.id}
            data-active={related ? related.has(u.id) : activeId === u.id}
            className={`relative ${
              u.speaker === "guest"
                ? "ui-panel"
                : "rounded-[var(--radius-soft)] border border-transparent px-5 py-3 data-[active=true]:border-[color:var(--color-rose)]"
            }`}
          >
            <span className="ui-thread-node -translate-x-[1.75rem]" data-speaker={u.speaker} aria-hidden />
            <div className="mb-2 flex flex-wrap items-baseline gap-x-4">
              <button
                type="button"
                className="ui-num text-left text-[color:var(--color-rose)] underline underline-offset-4"
                onClick={() => seek(u.startedAt, u.id)}
              >
                {ui.playFrom(formatTime(u.startedAt - (slateAtMs ?? 0)))}
              </button>
              {depthOf.get(u.id) != null && (
                <span className="text-[color:var(--color-ink-muted)]">{ui.depthRings[depthOf.get(u.id)!]}</span>
              )}
            </div>
            {u.speaker === "guest" ? (
              <textarea
                value={u.text}
                rows={2}
                className="ui-field mb-2 w-full"
                onChange={(e) =>
                  updateTranscriptEntry(u.id, {
                    text: e.target.value,
                    originalText: u.originalText ?? u.text,
                  })
                }
              />
            ) : (
              <p className="mb-1 text-[color:var(--color-ink-muted)]">{u.text}</p>
            )}
            <div className="my-3 flex flex-wrap gap-4">
              <label className="flex flex-col gap-1">{prepare.language === "ja" ? "開始（秒・収録先頭から）" : "Start (seconds from recording)"}
                <input className="ui-field max-w-40" type="number" min="0" step="0.1" value={u.startedAt / 1000}
                  onChange={(event) => {
                    const startedAt = Math.max(0, Number(event.target.value) * 1000);
                    updateTranscriptEntry(u.id, { startedAt, endedAt: Math.max(startedAt + 100, u.endedAt) });
                  }} />
              </label>
              <label className="flex flex-col gap-1">{prepare.language === "ja" ? "終了（秒）" : "End (seconds)"}
                <input className="ui-field max-w-40" type="number" min={(u.startedAt + 100) / 1000} step="0.1" value={u.endedAt / 1000}
                  onChange={(event) => updateTranscriptEntry(u.id, { endedAt: Math.max(u.startedAt + 100, Number(event.target.value) * 1000) })} />
              </label>
            </div>
            <label className="flex gap-2 text-[color:var(--color-ink-muted)]">
              <input
                type="checkbox"
                checked={Boolean(u.excluded)}
                onChange={(e) => updateTranscriptEntry(u.id, { excluded: e.target.checked })}
              />
              <span>{ui.excludeLine}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="mt-4 text-[color:var(--color-rose)]">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void buildPage()}
        className="ui-btn mt-6"
      >
        {busy ? ui.buildingPage : ui.saveDraft}
      </button>
    </div>
  );
}
