"use client";

import { useCallback, useEffect, useRef } from "react";
import { REALTIME_SESSION_DURATION_MS } from "@/lib/realtime/config";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

export function useSessionTimeLimit(onExpire: () => void) {
  const sessionEndsAt = useRealtimeInterviewStore((s) => s.sessionEndsAt);
  const setSessionEndsAt = useRealtimeInterviewStore((s) => s.setSessionEndsAt);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  const arm = useCallback(() => {
    setSessionEndsAt(Date.now() + REALTIME_SESSION_DURATION_MS);
  }, [setSessionEndsAt]);

  const disarm = useCallback(() => {
    setSessionEndsAt(null);
  }, [setSessionEndsAt]);

  useEffect(() => {
    if (sessionEndsAt === null) return;

    const msLeft = sessionEndsAt - Date.now();
    if (msLeft <= 0) {
      expireRef.current();
      return;
    }

    const timeoutId = setTimeout(() => {
      expireRef.current();
    }, msLeft);

    return () => clearTimeout(timeoutId);
  }, [sessionEndsAt]);

  return { arm, disarm, sessionEndsAt };
}
