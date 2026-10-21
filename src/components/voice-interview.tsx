"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InterviewThemeId } from "@/lib/interview/types";
import type { PublicInterviewSession } from "@/lib/interview/public-dto";
import {
  SUPPORTED_INTERVIEW_LANGUAGES,
  languageDisplayName,
  type InterviewLanguage,
} from "@/lib/interview/languages";
import { getVoiceUiCopy } from "@/lib/i18n/voice-ui";
import { canStartAnswerRecording, canSubmitTranscript } from "@/lib/voice/pipeline-state";

/** sessionStorage: cleared when browser tab closes (lower XSS persistence than localStorage). */
const STORAGE_KEY = "hm_voice_session";

interface HistoryItem {
  id: string;
  speaker: string;
  originalTranscript?: string;
  confirmedTranscript?: string;
  sequenceNum: number;
}

export function VoiceInterview() {
  const [themeId] = useState<InterviewThemeId>("A");
  const [language, setLanguage] = useState<InterviewLanguage>("en");
  const v = getVoiceUiCopy(language);

  const [session, setSession] = useState<PublicInterviewSession | null>(null);
  const [auth, setAuth] = useState<{ participantId: string; participantToken: string } | null>(
    null,
  );
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [questionText, setQuestionText] = useState("");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [utteranceId, setUtteranceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unknown">(
    "unknown",
  );
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "stt">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [resumeId, setResumeId] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartedAt = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const clientSttIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          sessionId: string;
          participantId: string;
          participantToken: string;
        };
        setResumeId(parsed.sessionId);
        setAuth({ participantId: parsed.participantId, participantToken: parsed.participantToken });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
      h["X-Participant-Id"] = auth.participantId;
      h["X-Participant-Token"] = auth.participantToken;
    }
    return h;
  }, [auth]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "audioinput")))
      .catch(() => undefined);
  }, [micPermission]);

  const persistCredentials = useCallback(
    (sessionId: string, cred: { participantId: string; participantToken: string }) => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, ...cred }));
    },
    [],
  );

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
    } catch {
      setMicPermission("denied");
    }
  }, [deviceId]);

  const grantConsentsOnServer = useCallback(
    async (sessionId: string, cred: { participantId: string; participantToken: string }) => {
      const consentHeaders = {
        "Content-Type": "application/json",
        "X-Participant-Id": cred.participantId,
        "X-Participant-Token": cred.participantToken,
      };
      await fetch("/api/interview/consent", {
        method: "POST",
        headers: consentHeaders,
        body: JSON.stringify({ sessionId, consentType: "recording", granted: true }),
      });
      await fetch("/api/interview/consent", {
        method: "POST",
        headers: consentHeaders,
        body: JSON.stringify({ sessionId, consentType: "ai_conversation", granted: true }),
      });
    },
    [],
  );

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          themeId,
          interviewLanguage: language,
          publishingLanguage: language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? v.apiError);
      setSession(data.session);
      const cred = data.participantCredentials;
      setAuth(cred);
      setQuestionText(data.message);
      if (consentRecording && consentAi && cred) {
        await grantConsentsOnServer(data.session.id, cred);
        persistCredentials(data.session.id, cred);
      }
      setStarted(true);
      await requestMic();
    } catch (e) {
      setError(e instanceof Error ? e.message : v.apiError);
    } finally {
      setLoading(false);
    }
  }, [
    themeId,
    language,
    consentRecording,
    consentAi,
    v.apiError,
    requestMic,
    grantConsentsOnServer,
    persistCredentials,
  ]);

  const resumeSession = useCallback(async () => {
    if (!auth || !resumeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: {
          ...headers(),
          "X-Participant-Id": auth.participantId,
          "X-Participant-Token": auth.participantToken,
        },
        body: JSON.stringify({ action: "resume", sessionId: resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? v.apiError);
      setSession(data.session);
      setQuestionText(data.message ?? "");
      setHistory(data.utterances ?? []);
      setLanguage(data.session.language?.interviewLanguage ?? language);
      setStarted(true);
      await requestMic();
    } catch (e) {
      setError(e instanceof Error ? e.message : v.apiError);
    } finally {
      setLoading(false);
    }
  }, [auth, resumeId, headers, v.apiError, language, requestMic]);

  const playTts = useCallback(
    async (text: string) => {
      if (!session || !auth) return;
      if (!consentAi) {
        setError(v.consentRevoked);
        return;
      }
      setTtsPlaying(true);
      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Participant-Id": auth.participantId,
            "X-Participant-Token": auth.participantToken,
          },
          body: JSON.stringify({ sessionId: session.id, text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? v.apiError);
        const src = `data:${data.mimeType};base64,${data.audioBase64}`;
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = src;
        audioRef.current.onended = () => setTtsPlaying(false);
        await audioRef.current.play();
      } catch (e) {
        setTtsPlaying(false);
        setError(e instanceof Error ? e.message : v.apiError);
      }
    },
    [session, auth, consentAi, v.apiError, v.consentRevoked],
  );

  useEffect(() => {
    if (started && questionText && session && auth && consentAi) {
      void playTts(questionText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, questionText]);

  const pipelineBase = useCallback(
    () => ({
      hasRecordingConsent: consentRecording,
      hasAiConversationConsent: consentAi,
      isTtsPlaying: ttsPlaying,
      isRecording,
      isSending: loading || phase !== "idle",
      micPermission,
    }),
    [consentRecording, consentAi, ttsPlaying, isRecording, loading, phase, micPermission],
  );

  const cancelRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    recordStartedAt.current = null;
  }, []);

  const uploadAndTranscribe = useCallback(
    async (blob: Blob, startMs: number, endMs: number) => {
      if (!session || !auth) return;
      setPhase("uploading");
      clientSttIdRef.current = crypto.randomUUID();
      try {
        const urlRes = await fetch("/api/voice/upload-url", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            sessionId: session.id,
            mimeType: blob.type || "audio/webm",
            byteSize: blob.size,
            durationMs: Math.max(0, endMs - startMs),
            sourceType: "browser_recording",
          }),
        });
        const urlData = await urlRes.json();

        if (urlRes.ok && !String(urlData.signedUrl).startsWith("memory-upload://")) {
          const put = await fetch(urlData.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": blob.type || "audio/webm" },
            body: blob,
          });
          if (!put.ok) throw new Error(v.apiError);
          const fin = await fetch("/api/voice/upload-complete", {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              sessionId: session.id,
              assetId: urlData.assetId,
              byteSize: blob.size,
            }),
          });
          if (!fin.ok) throw new Error(v.apiError);
          setPhase("stt");
          const form = new FormData();
          form.set("sessionId", session.id);
          form.set("language", language);
          form.set("audioAssetId", urlData.assetId);
          form.set("clientSttId", clientSttIdRef.current);
          form.set("startMs", String(Math.round(startMs)));
          form.set("endMs", String(Math.round(endMs)));
          const sttRes = await fetch("/api/voice/stt", {
            method: "POST",
            headers: {
              "X-Participant-Id": auth.participantId,
              "X-Participant-Token": auth.participantToken,
            },
            body: form,
          });
          const sttData = await sttRes.json();
          if (!sttRes.ok) throw new Error(sttData.error ?? v.sttFailed);
          setTranscript(sttData.text);
          setUtteranceId(sttData.utteranceId);
          setShowTextFallback(false);
          return;
        }

        setPhase("stt");
        const form = new FormData();
        form.set("sessionId", session.id);
        form.set("language", language);
        form.set("audio", blob, "answer.webm");
        form.set("clientSttId", clientSttIdRef.current!);
        form.set("startMs", String(Math.round(startMs)));
        form.set("endMs", String(Math.round(endMs)));
        const sttRes = await fetch("/api/voice/stt", {
          method: "POST",
          headers: {
            "X-Participant-Id": auth.participantId,
            "X-Participant-Token": auth.participantToken,
          },
          body: form,
        });
        const sttData = await sttRes.json();
        if (!sttRes.ok) throw new Error(sttData.error ?? v.sttFailed);
        setTranscript(sttData.text);
        setUtteranceId(sttData.utteranceId);
        setShowTextFallback(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : v.sttFailed);
        setShowTextFallback(true);
      } finally {
        setPhase("idle");
      }
    },
    [session, auth, headers, language, v.apiError, v.sttFailed],
  );

  const beginRecording = useCallback(async () => {
    if (!canStartAnswerRecording(pipelineBase())) {
      if (ttsPlaying) setError(v.recordingBlockedDuringTts);
      if (!consentRecording || !consentAi) setError(v.consentRevoked);
      return;
    }
    setError(null);
    setUtteranceId(null);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    chunksRef.current = [];
    recordStartedAt.current = performance.now();
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.start();
    setIsRecording(true);
  }, [pipelineBase, ttsPlaying, consentRecording, consentAi, deviceId, v]);

  const endRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec || !session || !auth) return;
    setIsRecording(false);
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    });
    const endMs = performance.now();
    const startMs = recordStartedAt.current ?? endMs;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    setLoading(true);
    await uploadAndTranscribe(blob, startMs, endMs);
    setLoading(false);
  }, [session, auth, uploadAndTranscribe]);

  const confirmAndSend = useCallback(
    async (command: "none" | "skip" | "end" = "none") => {
      if (!session || !auth || sendingRef.current) return;
      if (command === "none" && !canSubmitTranscript(transcript, pipelineBase())) return;

      sendingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        if (command === "none" && utteranceId && transcript.trim()) {
          const confirmRes = await fetch("/api/voice/transcript/confirm", {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              sessionId: session.id,
              utteranceId,
              confirmedTranscript: transcript.trim(),
            }),
          });
          if (!confirmRes.ok) {
            const c = await confirmRes.json();
            throw new Error(c.error ?? v.apiError);
          }
        }

        const clientMessageId = crypto.randomUUID();
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: {
            ...headers(),
            "X-Participant-Id": auth.participantId,
            "X-Participant-Token": auth.participantToken,
          },
          body: JSON.stringify({
            action: "message",
            sessionId: session.id,
            text: transcript,
            command,
            clientMessageId,
            utteranceId: command === "none" && utteranceId ? utteranceId : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? v.apiError);
        setSession(data.session);
        setTranscript("");
        setUtteranceId(null);
        if (data.session.status !== "active") return;
        setQuestionText(data.message);
      } catch (e) {
        setError(e instanceof Error ? e.message : v.apiError);
      } finally {
        setLoading(false);
        sendingRef.current = false;
      }
    },
    [session, auth, transcript, utteranceId, headers, v, pipelineBase],
  );

  const changeLang = useCallback(
    async (next: InterviewLanguage) => {
      if (!session || !auth) {
        setLanguage(next);
        return;
      }
      setLoading(true);
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Participant-Id": auth.participantId,
          "X-Participant-Token": auth.participantToken,
        },
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
      setLoading(false);
      if (res.ok) {
        setSession(data.session);
        setLanguage(next);
        if (data.message) setQuestionText(data.message);
      }
    },
    [session, auth],
  );

  const revokeConsents = useCallback(async () => {
    if (!session || !auth) return;
    setConsentRecording(false);
    setConsentAi(false);
    const h = {
      "Content-Type": "application/json",
      "X-Participant-Id": auth.participantId,
      "X-Participant-Token": auth.participantToken,
    };
    await fetch("/api/interview/consent", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ sessionId: session.id, consentType: "recording", granted: false }),
    });
    await fetch("/api/interview/consent", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ sessionId: session.id, consentType: "ai_conversation", granted: false }),
    });
    if (audioRef.current) {
      audioRef.current.pause();
      setTtsPlaying(false);
    }
    setError(v.consentRevoked);
  }, [session, auth, v.consentRevoked]);

  if (!started) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
        <Link href="/" className="text-sm text-[color:var(--color-ink-muted)] underline">
          {v.textInterviewLink}
        </Link>
        <h1 className="text-xl font-semibold">{v.voiceTitle}</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">{v.voiceSubtitle}</p>
        <p className="text-xs text-[color:var(--color-ink-muted)]">{v.externalWavNote}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={consentAi} onChange={(e) => setConsentAi(e.target.checked)} />
          {v.consentAi}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={consentRecording}
            onChange={(e) => setConsentRecording(e.target.checked)}
          />
          {v.consentRecording}
        </label>
        <select
          className="rounded border px-2 py-2 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value as InterviewLanguage)}
        >
          {SUPPORTED_INTERVIEW_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {languageDisplayName(code)}
            </option>
          ))}
        </select>
        {resumeId && auth && (
          <button
            type="button"
            className="rounded-full border py-3 text-sm"
            disabled={loading}
            onClick={() => void resumeSession()}
          >
            {v.resumeSession}
          </button>
        )}
        <button
          type="button"
          disabled={!consentAi || !consentRecording || loading}
          className="rounded-sm border border-[color:var(--color-ink)] py-3 disabled:opacity-40"
          onClick={startSession}
        >
          {v.grantConsents}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 p-4 pb-10">
      <p className="text-xs text-amber-800 bg-amber-50 rounded p-2">{v.aiVoiceDisclosure}</p>
      <div className="flex flex-wrap gap-2 text-xs text-[color:var(--color-ink-muted)]">
        <span>
          {v.currentLanguage}: {languageDisplayName(language)}
        </span>
        <span>
          {v.micStatus}: {micPermission === "granted" ? v.micGranted : v.micDenied}
        </span>
        <span>{ttsPlaying ? v.ttsPlaying : v.ttsStopped}</span>
        <span>
          {v.consentStatus}: {consentRecording && consentAi ? "OK" : "—"}
        </span>
        {phase !== "idle" && <span>{v.processing}</span>}
      </div>
      <label className="text-xs">
        {v.selectInputDevice}
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          <option value="">Default</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
      </label>
      <section className="rounded-lg border p-3">
        <h2 className="text-sm font-medium">{v.questionLabel}</h2>
        <p className="mt-2 text-sm">{questionText}</p>
        <button
          type="button"
          className="mt-2 text-sm underline"
          disabled={ttsPlaying || !consentAi}
          onClick={() => playTts(questionText)}
        >
          {v.replayQuestion}
        </button>
      </section>
      {history.length > 0 && (
        <section className="rounded-lg border p-3 max-h-40 overflow-y-auto">
          <h2 className="text-sm font-medium">{v.historyLabel}</h2>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            {history.map((h) => (
              <li key={h.id}>
                <strong>{h.speaker}:</strong> {h.confirmedTranscript ?? h.originalTranscript}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-lg border p-3">
        <p className="text-sm font-medium">{v.transcriptLabel}</p>
        <textarea
          className="mt-2 w-full rounded border p-2 text-sm"
          rows={4}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={showTextFallback ? v.typeInstead : v.editTranscript}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-red-600 px-4 py-3 text-sm text-white"
            disabled={!canStartAnswerRecording(pipelineBase())}
            onMouseDown={() => void beginRecording()}
            onMouseUp={() => void endRecording()}
            onMouseLeave={() => isRecording && cancelRecording()}
            onTouchStart={(e) => {
              e.preventDefault();
              void beginRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              void endRecording();
            }}
          >
            {isRecording ? v.recordingActive : v.holdToRecord}
          </button>
          {isRecording && (
            <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={cancelRecording}>
              {v.cancelRecording}
            </button>
          )}
          <button
            type="button"
            className="rounded-sm border border-[color:var(--color-ink)] px-4 py-2 text-sm"
            disabled={loading || !canSubmitTranscript(transcript, pipelineBase())}
            onClick={() => confirmAndSend("none")}
          >
            {v.confirmSend}
          </button>
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-sm"
            disabled={loading}
            onClick={() => confirmAndSend("skip")}
          >
            {v.skip}
          </button>
          <button
            type="button"
            className="rounded-full border px-4 py-2 text-sm"
            disabled={loading}
            onClick={() => confirmAndSend("end")}
          >
            {v.end}
          </button>
        </div>
      </section>
      <select
        className="rounded border px-2 py-2 text-sm"
        value={language}
        onChange={(e) => changeLang(e.target.value as InterviewLanguage)}
      >
        {SUPPORTED_INTERVIEW_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {languageDisplayName(code)}
          </option>
        ))}
      </select>
      <button type="button" className="text-xs text-[color:var(--color-ink-muted)] underline" onClick={() => void revokeConsents()}>
        Withdraw recording / AI consent
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
