"use client";

import { useCallback, useMemo, useState } from "react";
import type { InterviewThemeId } from "@/lib/interview/types";
import type { PublicInterviewSession } from "@/lib/interview/public-dto";
import {
  SUPPORTED_INTERVIEW_LANGUAGES,
  languageDisplayName,
  type InterviewLanguage,
} from "@/lib/interview/languages";
import { getUiDictionary, uiLocaleFromInterviewLanguage } from "@/lib/i18n";

export function InterviewChat() {
  const [session, setSession] = useState<PublicInterviewSession | null>(null);
  const [participantAuth, setParticipantAuth] = useState<{
    participantId: string;
    participantToken: string;
  } | null>(null);
  const [themeId, setThemeId] = useState<InterviewThemeId>("A");
  const [interviewLanguage, setInterviewLanguage] = useState<InterviewLanguage>("en");
  const [uiLocale, setUiLocale] = useState<InterviewLanguage>("en");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(() => getUiDictionary(uiLocale), [uiLocale]);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUiLocale(uiLocaleFromInterviewLanguage(interviewLanguage));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          themeId,
          interviewLanguage,
          publishingLanguage: interviewLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errors.startFailed);
      setSession(data.session);
      if (data.participantCredentials) {
        setParticipantAuth(data.participantCredentials);
      }
      setUiLocale(data.session.language.interviewLanguage);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.startFailed);
    } finally {
      setLoading(false);
    }
  }, [themeId, interviewLanguage, t.errors.startFailed]);

  const send = useCallback(
    async (command: "none" | "skip" | "change_topic" | "end" = "none") => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (participantAuth) {
          headers["X-Participant-Id"] = participantAuth.participantId;
          headers["X-Participant-Token"] = participantAuth.participantToken;
        }
        const res = await fetch("/api/interview", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "message",
            sessionId: session.id,
            text: input,
            command,
            clientMessageId: crypto.randomUUID(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t.errors.sendFailed);
        setSession(data.session);
        setInput("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t.errors.sendFailed);
      } finally {
        setLoading(false);
      }
    },
    [session, input, t.errors.sendFailed],
  );

  const changeInterviewLanguage = useCallback(
    async (next: InterviewLanguage) => {
      if (!session || session.status !== "active") {
        setInterviewLanguage(next);
        setUiLocale(next);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (participantAuth) {
          headers["X-Participant-Id"] = participantAuth.participantId;
          headers["X-Participant-Token"] = participantAuth.participantToken;
        }
        const res = await fetch("/api/interview", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "message",
            sessionId: session.id,
            text: "",
            command: "change_language",
            interviewLanguage: next,
            publishingLanguage: next,
            clientMessageId: crypto.randomUUID(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t.errors.unsupportedLanguage);
        setSession(data.session);
        setUiLocale(next);
        setInterviewLanguage(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.errors.unsupportedLanguage);
      } finally {
        setLoading(false);
      }
    },
    [session, t.errors.unsupportedLanguage],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="border-b border-[color:var(--color-line)] pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t.appTitle}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{t.appSubtitle}</p>
      </header>

      {!session ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t.themeLabel}
            <select
              className="rounded-sm border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2"
              value={themeId}
              onChange={(e) => setThemeId(e.target.value as InterviewThemeId)}
            >
              {(["A", "B", "C", "D", "E"] as const).map((id) => (
                <option key={id} value={id}>
                  {t.themes[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t.interviewLanguageLabel}
            <select
              className="rounded-sm border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2"
              value={interviewLanguage}
              onChange={(e) => {
                const lang = e.target.value as InterviewLanguage;
                setInterviewLanguage(lang);
                setUiLocale(lang);
              }}
            >
              {SUPPORTED_INTERVIEW_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {languageDisplayName(code)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={start}
            className="rounded-sm border border-[color:var(--color-ink)] px-5 py-3 text-sm disabled:opacity-50"
          >
            {loading ? t.starting : t.beginInterview}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-ink-muted)]">
            <span>
              {t.stage}: {session.currentStage}
            </span>
            <span>
              {t.questions}: {session.totalQuestionsAsked}/{session.maxQuestions}
            </span>
            <span>
              {t.status}: {session.status}
            </span>
            <label className="ml-auto flex items-center gap-1">
              {t.changeLanguage}
              <select
                className="rounded-sm border border-[color:var(--color-line)] px-1 py-0.5"
                value={session.language.interviewLanguage}
                onChange={(e) =>
                  changeInterviewLanguage(e.target.value as InterviewLanguage)
                }
                disabled={loading}
              >
                {SUPPORTED_INTERVIEW_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {languageDisplayName(code)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="flex max-h-[420px] flex-col gap-3 overflow-y-auto border border-[color:var(--color-line)] p-4">
            {session.turns.map((turn) => (
              <li
                key={turn.id}
                className={
                  turn.role === "user" ? "ml-8 text-right text-sm" : "mr-8 text-sm"
                }
              >
                <span className="font-medium capitalize">{turn.role}: </span>
                {turn.text}
              </li>
            ))}
          </ul>
          {session.status === "active" && (
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-[88px] rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                placeholder={t.yourAnswerPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send("none")}
                  className="rounded-sm border border-[color:var(--color-ink)] px-4 py-2 text-sm disabled:opacity-50"
                >
                  {t.send}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send("skip")}
                  className="rounded-full border px-4 py-2 text-sm"
                >
                  {t.skipQuestion}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send("change_topic")}
                  className="rounded-full border px-4 py-2 text-sm"
                >
                  {t.changeTopic}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => send("end")}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700"
                >
                  {t.endEarly}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
