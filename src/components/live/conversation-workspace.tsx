"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { resolveWorkspaceView, type WorkspaceView } from "@/lib/graph/workspace-view";
import type { ListeningPhase, Utterance } from "@/lib/realtime/types";
import { summarizeMapUpdate } from "@/lib/graph/map-update-status";
import { SelfAnalysisMap } from "@/components/graph/self-analysis-map";
import { buildSelfAnalysisMap } from "@/lib/graph/self-analysis-map";
import type { EditingEvent } from "@/lib/recording/editing-capture";

type Props = {
  utterances: Utterance[];
  language: "ja" | "en";
  guestName?: string;
  inputState: "idle" | "speaking" | "transcribing" | "failed";
  pendingSince: number | null;
  phase: ListeningPhase;
  error?: string | null;
  onCapture?: (type: EditingEvent["type"], data: unknown) => void;
};

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function serverMobileSnapshot() {
  return false;
}

export function ConversationWorkspace({ utterances, language, guestName, inputState, pendingSince, phase, error, onCapture }: Props) {
  const ja = language === "ja";
  const [preferredView, setView] = useState<WorkspaceView>("both");
  const mobile = useSyncExternalStore(subscribeMobile, isMobileViewport, serverMobileSnapshot);
  const view = resolveWorkspaceView(preferredView, mobile);
  const [now, setNow] = useState(0);
  const deferred = useDeferredValue(utterances);
  const summary = useMemo(() => summarizeMapUpdate(deferred), [deferred]);
  const logRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const currentQuestion = [...utterances].reverse().find((row) => row.speaker === "ai")?.text;
  const updating = deferred !== utterances;
  const waitingSeconds = pendingSince ? Math.max(0, Math.floor((now - pendingSince) / 1000)) : 0;
  const busy = inputState === "transcribing" || updating;
  useEffect(() => { onCapture?.("chat_update", { utterances }); }, [utterances, onCapture]);
  useEffect(() => {
    const { categories, nodes, relations, coreNodeId } = buildSelfAnalysisMap(deferred);
    onCapture?.("map_update", { categories, nodes, relations, coreNodeId });
  }, [deferred, onCapture]);
  useEffect(() => { onCapture?.("view_change", { view }); }, [view, onCapture]);

  useEffect(() => {
    if (!pendingSince) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [pendingSince]);
  useEffect(() => {
    const log = logRef.current;
    if (log && followRef.current) log.scrollTop = log.scrollHeight;
  }, [utterances, view]);

  const feedback = error ? (ja ? "接続に問題があります。下のエラーを確認してください。" : "Connection issue. Check the error below.")
    : inputState === "failed" ? (ja ? "文字起こしに失敗しました。この発言はまだマップに反映されていません。もう一度ゆっくり話してください。" : "Transcription failed. This turn is not on the map yet. Please try speaking again.")
    : inputState === "speaking" ? (ja ? "お話を聞いています。話し終わると文字起こしを確認します。" : "Listening. Your transcript will be checked when you finish speaking.")
    : inputState === "transcribing" ? (waitingSeconds >= 15 ? (ja ? `文字起こしの確定に時間がかかっています（${waitingSeconds}秒）。接続を確認してください。画面の切替は引き続き使えます。` : `Transcription is taking longer (${waitingSeconds}s). Check your connection. You can still switch views.`) : (ja ? `文字起こしを確認中（${waitingSeconds}秒）。届き次第、マップに反映します。反映を待たずに話を続けられます。` : `Waiting for transcription (${waitingSeconds}s). The map will update when it arrives. You can keep talking without waiting.`))
    : updating ? (ja ? "届いた言葉をマップに反映しています…" : "Updating the map with your words…")
    : summary.turnId ? (summary.added ? (ja ? `反映しました。新しい言葉が${summary.added}語加わりました。` : `Updated. ${summary.added} new keywords added.`) : summary.updated ? (ja ? "反映しました。既存の言葉に発言の根拠を追加しました。" : "Updated the source evidence for existing keywords.") : (ja ? "発言を記録しました。今回は新しいキーワードはありません。" : "Turn recorded. No new keywords this time."))
    : (ja ? "最初のお話から、マップに言葉が増えていきます。" : "Keywords will appear as you share your story.");

  return <section className="conversation-workspace" data-view={view} aria-label={ja ? "チャットとマインドマップ" : "Chat and mind map"}>
    <div className="workspace-toolbar recording-exclude" role="group" aria-label={ja ? "表示の切替" : "Switch views"}>
      {(["chat", "map", "both"] as const).filter((mode) => !mobile || mode !== "both").map((mode) => <button key={mode} data-mode={mode} type="button" className="ui-btn-sub" aria-pressed={view === mode} aria-controls="workspace-chat workspace-map" onClick={() => setView(mode)}>{mode === "chat" ? (ja ? "チャット" : "Chat") : mode === "map" ? (ja ? "マインドマップ" : "Mind map") : (ja ? "両方を見る" : "Both")}</button>)}
    </div>
    <div className="workspace-feedback recording-exclude" role="status" aria-live="polite" aria-atomic="true" data-busy={busy}>
      <span className="workspace-state-dot" aria-hidden="true" />
      <p>{feedback}</p>
    </div>
    {view === "map" && currentQuestion && <p className="workspace-question-preview"><span>{ja ? "いまの質問：" : "Current question: "}</span>{currentQuestion}</p>}
    <div className="workspace-panels">
      <section id="workspace-chat" className="workspace-chat" hidden={view === "map"} aria-label={ja ? "会話ログ" : "Conversation log"}>
        <h2>{ja ? "チャット" : "Chat"}</h2>
        <div ref={logRef} className="workspace-chat-log" tabIndex={0} onScroll={(event) => { const log = event.currentTarget; followRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80; }}>
          {!utterances.length && <p>{ja ? "最初の質問を待っています。" : "Waiting for the first question."}</p>}
          {utterances.filter((row) => row.text.trim()).map((row) => <div key={row.id} className="workspace-turn" data-speaker={row.speaker}>
            <p className="workspace-speaker">{row.speaker === "ai" ? (ja ? "聞き手" : "Interviewer") : row.speaker === "guest" ? (ja ? "あなた" : "You") : (ja ? "進行役" : "Host")}</p>
            <p>{row.text}</p>
            {row.interrupted && <p className="text-sm text-[color:var(--color-ink-muted)]">{ja ? "読み上げは途中で停止しました" : "Audio playback was interrupted"}</p>}
          </div>)}
        </div>
        <p className="workspace-chat-hint">{phase === "ai_speaking" ? (ja ? "聞き手が話しています" : "The interviewer is speaking") : (ja ? "自然なペースでお話しください。" : "Speak at your own pace.")}</p>
      </section>
      <section id="workspace-map" className="workspace-map" hidden={view === "chat"} aria-label={ja ? "ライブマップ" : "Live map"} aria-busy={busy}>
        <SelfAnalysisMap utterances={deferred} guestName={guestName} language={language} showStory={false} live />
      </section>
    </div>
    {view === "chat" && summary.turnId && <button type="button" className="workspace-map-preview recording-exclude" onClick={() => setView("map")}>{ja ? "更新されたマップを見る" : "View the updated map"}</button>}
  </section>;
}
