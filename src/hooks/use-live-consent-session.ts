"use client";

import { useCallback, useState } from "react";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export type LiveParticipantAuth = {
  sessionId: string;
  participantId: string;
  participantToken: string;
};

export async function createLiveConsentSession(language: string, consents: { ai: boolean; photoVideo: boolean; recording: boolean }): Promise<LiveParticipantAuth> {
  const response = await fetch("/api/live-consent", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, consents }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "PIPELINE_AUTH" : data?.error === "PIPELINE_ORIGIN" ? "PIPELINE_ORIGIN" : "CONSENT_SAVE_FAILED");
  if (!data?.session?.id || !data.participantCredentials?.participantId || !data.participantCredentials?.participantToken) throw new Error("CONSENT_SAVE_FAILED");
  return { sessionId: data.session.id, participantId: data.participantCredentials.participantId, participantToken: data.participantCredentials.participantToken };
}

export function useLiveConsentSession() {
  const [auth, setAuth] = useState<LiveParticipantAuth | null>(null);

  const grantConsents = useCallback(
    async (opts: { ai: boolean; photoVideo: boolean; recording: boolean; needInterviewSession: boolean }) => {
      if (!opts.ai) return false;
      if (opts.needInterviewSession) {
        const session = await createLiveConsentSession(useMagazineFlowStore.getState().prepare.language, opts);
        setAuth(session);
        return true;
      }
      return true;
    },
    [],
  );

  return { auth, grantConsents };
}
