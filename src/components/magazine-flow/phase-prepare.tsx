"use client";
import { ModelComparisonSettings } from "@/components/live/model-comparison-settings";
import { InterviewEngineSettings } from "@/components/live/interview-engine-settings";
import { pipelineError } from "@/lib/pipeline/copy";
import { useRecordingSession } from "@/contexts/recording-session-context";

import { useMemo, useState } from "react";
import { ThoughtGraph } from "@/components/graph/thought-graph";
import { buildConversationGraph } from "@/lib/graph/build-conversation-graph";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";
import { INTERVIEWER_AGENTS } from "@/lib/realtime/interviewer-agents";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useLiveConsentSession } from "@/hooks/use-live-consent-session";
import { useMicLevel } from "@/hooks/use-mic-level";
import type { InterviewerProfile } from "@/lib/magazine-flow/types";
import { interviewStartBlockers } from "@/lib/magazine-flow/start-readiness";

type Props = { mockOnly: boolean; onStartDemo: () => void };

export function PhasePrepare({ mockOnly, onStartDemo }: Props) {
  const ui = useMagazineFlowUi();
  const recorder = useRecordingSession();
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const setPrepare = useMagazineFlowStore((s) => s.setPrepare);
  const persistPrepare = useMagazineFlowStore((s) => s.persistPrepare);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const markSessionStart = useMagazineFlowStore((s) => s.markSessionStart);
  const setReleaseConsent = useMagazineFlowStore((s) => s.setReleaseConsent);
  const { grantConsents } = useLiveConsentSession();
  const mic = useMicLevel(!mockOnly);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedGraph = useMemo(() => buildConversationGraph([], 5), []);
  const micStatus = mockOnly
    ? (prepare.language === "en" ? "The demo does not use your microphone or camera." : "デモではマイク・カメラを使用しません。")
    : mic.denied ? ui.micDenied : mic.hearing ? ui.micHearing : ui.micQuiet;

  const startBlockers = interviewStartBlockers(prepare);
  const canStart = startBlockers.length === 0;

  const onStart = async () => {
    if (!canStart || busy) return;
    setBusy(true);
    setError(null);
    try { await recorder.unlockAudio(); }
    catch { setError(prepare.language === "en" ? "Could not enable audio. Check browser audio permissions and try again." : "音声を有効にできません。ブラウザの音声設定を確認し、もう一度開始してください。"); setBusy(false); return; }
    if (prepare.interviewEngine === "pipeline") {
      try {
        const response = await fetch("/api/pipeline?preflight=1", { cache: "no-store" });
        if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
        const data = await response.json();
        if (data.cost.remainingUsd < 0.01) throw new Error("PIPELINE_BUDGET");
      } catch (failure) {
        setError(pipelineError(failure instanceof Error ? failure.message : "PIPELINE_STORAGE", prepare.language === "en"));
        setBusy(false);
        return;
      }
    }
    let ok = false;
    try { ok = await grantConsents({
      ai: prepare.consents.aiConversation,
      photoVideo: prepare.consents.photoVideo,
      recording: prepare.consents.recording,
      needInterviewSession: !mockOnly,
    }); } catch (failure) { setError(pipelineError(failure instanceof Error && failure.message.startsWith("PIPELINE_") ? failure.message : "CONSENT_SAVE_FAILED", prepare.language === "en")); setBusy(false); return; }
    if (!ok && !mockOnly) {
      setError(ui.sessionFailed);
      setBusy(false);
      return;
    }
    persistPrepare();
    markSessionStart();
    setPhase("slate");
    setBusy(false);
  };

  const onDemo = () => {
    setReleaseConsent(null);
    if (!prepare.place.trim()) setPrepare({ place: ui.demoPlace });
    onStartDemo();
    markSessionStart();
    setPhase("slate");
  };

  return (
    <div className="mx-auto grid max-w-[72rem] gap-10 px-[var(--space-page-x)] py-[var(--space-page-y)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-start">
      <section className="flex flex-col items-center gap-5 md:sticky md:top-8">
        <div className="aspect-square w-[min(72vw,36vh,26rem)] md:w-full md:max-w-[26rem]">
          <ThoughtGraph graph={seedGraph} mode={mic.denied ? "idle" : "listening"} micRef={mic.rawRef} className="h-full w-full" />
        </div>
        <div
          role="meter"
          aria-label={ui.micLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={mic.level}
          aria-valuetext={micStatus}
          className="flex h-3 w-full max-w-[22rem] gap-[3px]"
        >
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className={`flex-1 ${
                !mic.denied && mic.level > i * 5 ? "bg-[color:var(--color-rose)]" : "bg-[color:var(--color-thread)]"
              } rounded-full`}
            />
          ))}
        </div>
        <p
          className={`max-w-[22rem] text-center text-[length:var(--text-body)] ${
            mic.denied || mic.hearing ? "text-[color:var(--color-rose)]" : "text-[color:var(--color-ink-muted)]"
          }`}
        >
          {micStatus}
        </p>
      </section>

      <section className="flex flex-col gap-6 text-[length:var(--text-body)]">
        <h1 className="ui-heading">{ui.prepareHeading}</h1>
        <InterviewEngineSettings value={prepare.interviewEngine} en={prepare.language === "en"} mockOnly={mockOnly} onChange={(interviewEngine) => { setPrepare({ interviewEngine }); persistPrepare(); }} />
        {prepare.interviewEngine !== "pipeline" && <ModelComparisonSettings value={prepare.realtimeModel} en={prepare.language === "en"} mockOnly={mockOnly} onChange={(realtimeModel) => { setPrepare({ realtimeModel }); persistPrepare(); }} />}

        <div className="ui-panel flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
            {ui.guestName}
            <input
              disabled={mockOnly}
              value={prepare.guestName}
              onChange={(e) => setPrepare({ guestName: e.target.value })}
              className="ui-field"
            />
          </label>
          <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
            {ui.place}
            <input
              disabled={mockOnly}
              value={prepare.place}
              onChange={(e) => setPrepare({ place: e.target.value })}
              className="ui-field"
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
              {ui.language}
              <select
                value={prepare.language}
                onChange={(e) => { setPrepare({ language: e.target.value as "ja" | "en" }); persistPrepare(); }}
                className="ui-field"
              >
                <option value="ja">{ui.languageJa}</option>
                <option value="en">{ui.languageEn}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
              {ui.agent}
              <select
                value={prepare.agentId}
                onChange={(e) => setPrepare({ agentId: e.target.value as "default" | "reflective" })}
                className="ui-field"
              >
                {INTERVIEWER_AGENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {ui[a.labelKey]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {prepare.language === "en" && <p className="text-sm text-[color:var(--color-ink-muted)]">The interface stays in English. If your first full answer is in another language, such as Korean or Chinese, the interviewer will continue in that language. Greetings or names alone do not trigger a switch.</p>}
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2">{prepare.language === "ja" ? "聞き手の雰囲気" : "Interviewer persona"}</legend>
            <label className="flex flex-col gap-1">
              {prepare.language === "ja" ? "年代" : "Age"}
              <select className="ui-field" value={prepare.interviewerProfile?.age ?? "adult"}
                onChange={(event) => setPrepare({ interviewerProfile: { gender: prepare.interviewerProfile?.gender ?? "neutral", age: event.target.value as InterviewerProfile["age"] } })}>
                <option value="young">{prepare.language === "ja" ? "若い成人・軽やか" : "Young adult / light"}</option>
                <option value="adult">{prepare.language === "ja" ? "大人・自然体" : "Adult / balanced"}</option>
                <option value="senior">{prepare.language === "ja" ? "年配・ゆったり" : "Senior / unhurried"}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              {prepare.language === "ja" ? "ジェンダー表現" : "Gender expression"}
              <select className="ui-field" value={prepare.interviewerProfile?.gender ?? "neutral"}
                onChange={(event) => setPrepare({ interviewerProfile: { age: prepare.interviewerProfile?.age ?? "adult", gender: event.target.value as InterviewerProfile["gender"] } })}>
                <option value="neutral">{prepare.language === "ja" ? "ニュートラル" : "Neutral"}</option>
                <option value="woman">{prepare.language === "ja" ? "女性" : "Woman"}</option>
                <option value="man">{prepare.language === "ja" ? "男性" : "Man"}</option>
              </select>
            </label>
          </fieldset>
          <label className="flex gap-3">
            <input
              type="checkbox"
              disabled={mockOnly}
              checked={prepare.includeCamera}
              onChange={(e) => setPrepare({ includeCamera: e.target.checked, consents: { ...prepare.consents, photoVideo: e.target.checked } })}
            />
            <span>
              {ui.includeCamera}{prepare.language === "ja" ? "（任意・編集素材として保存）" : " (optional; saved for editing)"}
            </span>
          </label>
        </div>

        <ul className="ui-panel flex flex-col gap-3">
          {(
            [
              ["aiConversation", `${ui.consentAiStreet}${prepare.interviewEngine === "pipeline" ? (prepare.language === "en" ? " Audio and conversation text are sent to OpenRouter and its AI providers for processing." : " 音声・会話テキストは処理のためOpenRouterと接続先のAI事業者に送信されます。") : ""}`],
              ["recording", ui.consentRecordingStreet],
              ["snsPublish", prepare.language === "en" ? "I understand publication on YouTube / SNS is planned and final scope, commercial use and signature will be confirmed after the interview. Recording is permitted now; no publication without final signed consent." : "YouTube・SNSへの掲載予定を確認しました。記録を許可し、会話後に掲載範囲・商用利用等を確認して最終署名します。署名保存までは公開を許可しません。"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  disabled={mockOnly}
                  checked={prepare.consents[key]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrepare({
                      consents: { ...prepare.consents, [key]: checked },
                    });
                  }}
                />
                <span className="leading-[var(--leading-body)]">{label}</span>
              </label>
            </li>
          ))}
        </ul>

        <p>{prepare.language === "en" ? "Confirm recording angles and privacy preferences with the operator before filming. After the conversation and report review, you will choose the final publication scope and sign. No signed consent means no publication." : "撮影前に画角や映したくない内容を運営者と確認してください。会話と分析結果の確認後、最後に掲載範囲を選んで署名します。署名保存のない素材は公開しません。"}</p>
        {error && <p className="text-[color:var(--color-rose)]">{error}</p>}
        {!mockOnly && <div id="interview-start-status" role="status" className="space-y-2 leading-loose">
          {startBlockers.length > 0 ? <><p>{prepare.language === "en" ? "Before you can start:" : "開始するために、次を確認してください。"}</p><ul className="list-disc pl-5">{startBlockers.map((reason) => <li key={reason}>{reason}</li>)}</ul></> : <p>{prepare.language === "en" ? "Ready to start. Press the button below." : "開始できます。下の開始ボタンを押してください。"}</p>}
        </div>}
        <div className="flex flex-wrap items-center gap-4">
          {!mockOnly && <button
            type="button"
            disabled={!canStart || busy}
            aria-describedby="interview-start-status"
            onClick={() => void onStart()}
            className="ui-btn"
          >
            {ui.startConversation}
          </button>}
            <button type="button" onClick={onDemo} className={mockOnly ? "ui-btn" : "ui-btn-sub"}>
              {ui.startDemo}
            </button>
        </div>
        <p className="text-[color:var(--color-ink-muted)]">{ui.demoHint}</p>
      </section>
    </div>
  );
}
