"use client";

import { useCallback, useState } from "react";
import type { ConsentType } from "@/lib/interview/consent";

const STORAGE_KEY = "liveInterviewParticipant";

export type LiveParticipantAuth = {
  sessionId: string;
  participantId: string;
  participantToken: string;
};

export function useLiveConsentSession() {
  const [auth, setAuth] = useState<LiveParticipantAuth | null>(null);

  const loadStoredAuth = useCallback((): LiveParticipantAuth | null => {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LiveParticipantAuth;
      if (parsed.sessionId && parsed.participantId && parsed.participantToken) return parsed;
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  const ensureInterviewSession = useCallback(async (): Promise<LiveParticipantAuth | null> => {
    const stored = loadStoredAuth();
    if (stored) {
      setAuth(stored);
      return stored;
    }
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        themeId: "A",
        interviewLanguage: "ja",
        publishingLanguage: "ja",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.participantCredentials) return null;
    const next: LiveParticipantAuth = {
      sessionId: data.session.id,
      participantId: data.participantCredentials.participantId,
      participantToken: data.participantCredentials.participantToken,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
    return next;
  }, [loadStoredAuth]);

  const postConsent = useCallback(
    async (session: LiveParticipantAuth, type: ConsentType, granted: boolean) => {
      await fetch("/api/interview/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Participant-Id": session.participantId,
          "X-Participant-Token": session.participantToken,
        },
        body: JSON.stringify({ sessionId: session.sessionId, consentType: type, granted }),
      });
    },
    [],
  );

  const grantConsents = useCallback(
    async (opts: { ai: boolean; photoVideo: boolean; recording: boolean; needInterviewSession: boolean }) => {
      if (!opts.ai) return false;
      if (opts.needInterviewSession) {
        const session = await ensureInterviewSession();
        if (!session) return false;
        await postConsent(session, "ai_conversation", true);
        if (opts.photoVideo) await postConsent(session, "photo_video", true);
        if (opts.recording) await postConsent(session, "recording", true);
        return true;
      }
      return true;
    },
    [ensureInterviewSession, postConsent],
  );

  return { auth, grantConsents };
}
