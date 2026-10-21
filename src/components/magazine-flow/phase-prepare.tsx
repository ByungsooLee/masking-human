"use client";

import { useMemo, useState } from "react";
import { ThoughtGraph } from "@/components/graph/thought-graph";
import { buildConversationGraph } from "@/lib/graph/build-conversation-graph";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { INTERVIEWER_AGENTS } from "@/lib/realtime/interviewer-agents";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useLiveConsentSession } from "@/hooks/use-live-consent-session";
import { useMicLevel } from "@/hooks/use-mic-level";

type Props = { mockOnly: boolean; onStartDemo: () => void };

export function PhasePrepare({ mockOnly, onStartDemo }: Props) {
  const ui = getMagazineFlowUi();
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const setPrepare = useMagazineFlowStore((s) => s.setPrepare);
  const persistPrepare = useMagazineFlowStore((s) => s.persistPrepare);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const markSessionStart = useMagazineFlowStore((s) => s.markSessionStart);
  const { grantConsents } = useLiveConsentSession();
  const mic = useMicLevel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedGraph = useMemo(() => buildConversationGraph([], 5), []);
  const micStatus = mic.denied ? ui.micDenied : mic.hearing ? ui.micHearing : ui.micQuiet;

  const canStart =
    prepare.consents.aiConversation &&
    prepare.consents.recording &&
    prepare.place.trim().length > 0;

  const onStart = async () => {
    setBusy(true);
    setError(null);
    const ok = await grantConsents({
      ai: prepare.consents.aiConversation,
      photoVideo: prepare.consents.photoVideo,
      recording: prepare.consents.recording,
      needInterviewSession: !mockOnly,
    });
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

        <div className="ui-panel flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
            {ui.guestName}
            <input
              value={prepare.guestName}
              onChange={(e) => setPrepare({ guestName: e.target.value })}
              className="ui-field"
            />
          </label>
          <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
            {ui.place}
            <input
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
                onChange={(e) => setPrepare({ language: e.target.value as "ja" | "en" })}
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
          <label className="flex gap-3">
            <input
              type="checkbox"
              checked={prepare.includeCamera}
              onChange={(e) => setPrepare({ includeCamera: e.target.checked })}
            />
            <span>{ui.includeCamera}</span>
          </label>
        </div>

        <ul className="ui-panel flex flex-col gap-3">
          {(
            [
              ["aiConversation", ui.consentAiStreet],
              ["recording", ui.consentRecordingStreet],
              ["snsPublish", ui.consentPublishStreet],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={prepare.consents[key]}
                  onChange={(e) =>
                    setPrepare({ consents: { ...prepare.consents, [key]: e.target.checked } })
                  }
                />
                <span className="leading-[var(--leading-body)]">{label}</span>
              </label>
            </li>
          ))}
        </ul>

        {error && <p className="text-[color:var(--color-rose)]">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!canStart || busy}
            onClick={() => void onStart()}
            className="ui-btn"
          >
            {ui.startConversation}
          </button>
          {!mockOnly && (
            <button type="button" onClick={onDemo} className="ui-btn-sub">
              {ui.startDemo}
            </button>
          )}
        </div>
        {!mockOnly && <p className="text-[color:var(--color-ink-muted)]">{ui.demoHint}</p>}
      </section>
    </div>
  );
}
