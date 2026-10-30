"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PrimaryNavigation } from "@/components/primary-navigation";
import { FacetChips } from "@/components/graph/facet-chips";
import { FocusDetail } from "@/components/graph/focus-detail";
import { ThoughtGraph } from "@/components/graph/thought-graph";
import { deleteArchivedSession, listArchivedSessions, type ArchivedSession } from "@/lib/archive/session-archive";
import { buildArchiveGraph } from "@/lib/graph/build-archive-graph";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";
import { bloomFontClassName } from "@/themes/bloom/fonts";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { ConversationJsonDownload } from "@/components/live/conversation-json-download";
import { signedReleases } from "@/lib/archive/participant-handover";

function guestTexts(row: ArchivedSession) {
  return row.transcript.filter((u) => u.speaker === "guest" && !u.excluded && u.text.trim()).map((u) => u.text);
}

export default function LiveArchivePage() {
  const ui = useMagazineFlowUi();
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const [rows, setRows] = useState<ArchivedSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void listArchivedSessions().then(setRows).catch(() => setLoadError(true));
  }, []);

  const graph = useMemo(
    () => buildArchiveGraph(rows.map((r) => ({ id: r.id, label: r.prepare.place || r.savedAt.slice(0, 10), guestTexts: guestTexts(r) }))),
    [rows],
  );
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
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    return {
      id,
      text: row.draft?.heroQuote.text ?? guestTexts(row)[0] ?? row.prepare.place,
      meta: `${row.prepare.place}　${row.savedAt.slice(0, 10)}`,
    };
  };

  return (
    <div data-theme="bloom" className={`${bloomFontClassName} bloom-ground theme-body min-h-screen`}>
      <header className="border-b border-[color:var(--color-thread)] px-[var(--space-page-x)] py-3">
        <div className="mx-auto max-w-[72rem]"><PrimaryNavigation /></div>
      </header>
      <div className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)] text-[length:var(--text-body)]">
        <h1 className="ui-heading mb-4">{ui.archiveHeading}</h1>
        <Link href="/live" className="mb-[var(--space-block)] inline-block text-[color:var(--color-rose)] underline underline-offset-4">
          {ui.backToLive}
        </Link>
        {loadError ? <p role="alert">{language === "ja" ? "履歴を読み込めませんでした。ブラウザの保存設定を確認し、再読み込みしてください。" : "Could not load history. Check browser storage settings and reload."}</p> : rows.length === 0 ? (
          <p className="text-[color:var(--color-ink-muted)]">{ui.archiveEmpty}</p>
        ) : (
          <>
            <section className="mb-[var(--space-block)] flex flex-col gap-4">
              <p className="text-[color:var(--color-ink-muted)]">{ui.archiveMapHint}</p>
              <div className="grid gap-4 landscape:md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="ui-panel h-[min(60vh,32rem)] p-2">
                  <ThoughtGraph graph={graph} mode="idle" selectedId={focus} onSelect={setSelectedId} className="h-full w-full" />
                </div>
                <div className="flex flex-col gap-4">
                  <FacetChips nodes={graph.nodes} selectedId={focus} onSelect={setSelectedId} />
                  <FocusDetail
                    graph={graph}
                    selectedId={focus}
                    describe={describe}
                    heading={ui.sessionsWithWord}
                    onSelect={setSelectedId}
                  />
                </div>
              </div>
            </section>

            <h2 className="mb-3 text-[color:var(--color-ink)]">{ui.archiveListHeading}</h2>
            <ul className="flex max-w-[var(--content-max)] flex-col gap-4">
              {rows.map((row) => (
                <li key={row.id} className="ui-panel" data-active={related?.has(row.id) ?? false}>
                  <ConversationJsonDownload session={row} en={language === "en"} />
                  <p className="mt-3 text-[color:var(--color-ink-muted)]">{language === "en" ? `Signature records: ${signedReleases(row).length} / Participant PDFs: ${row.participantReports?.length ?? 0}` : `署名履歴 ${signedReleases(row).length}件 ／ 本人向けPDF ${row.participantReports?.length ?? 0}件`}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link className="ui-btn inline-flex min-h-12 items-center" href={`/live/archive/${encodeURIComponent(row.id)}#participant-report`}>{language === "ja" ? "本人に渡すレポート・署名" : "Participant report & signature"}</Link>
                    <Link className="ui-btn-sub inline-block" href={`/live/archive/${encodeURIComponent(row.id)}`}>{language === "ja" ? "分析結果・素材を開く" : "Open analysis & media"}</Link>
                    <button
                      type="button"
                      className="ui-btn-sub py-1"
                      aria-pressed={focus === row.id}
                      onClick={() => setSelectedId(focus === row.id ? null : row.id)}
                    >
                      {ui.showOnMap}
                    </button>
                    <button
                      type="button"
                      className="ui-btn-sub py-1"
                      onClick={() => void deleteArchivedSession(row.id).then(() => listArchivedSessions().then(setRows))}
                    >
                      {ui.archiveDelete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
