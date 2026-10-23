"use client";

import { useCallback, useEffect, useRef } from "react";
import { REALTIME_SESSION_DURATION_MS } from "@/lib/realtime/config";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

export function useSessionTimeLimit(onExpire: () => void) {
  const sessionEndsAt = useRealtimeInterviewStore((s) => s.sessionEndsAt);
  const setSessionEndsAt = useRealtimeInterviewStore((s) => s.setSessionEndsAt);
  const expireRef = useRef(onExpire);
  const ownsTimerRef = useRef(false);
  useEffect(() => { expireRef.current = onExpire; }, [onExpire]);

  const arm = useCallback(() => {
    ownsTimerRef.current = true;
    setSessionEndsAt(Date.now() + REALTIME_SESSION_DURATION_MS);
  }, [setSessionEndsAt]);

  const disarm = useCallback(() => {
    if (!ownsTimerRef.current) return;
    ownsTimerRef.current = false;
    setSessionEndsAt(null);
  }, [setSessionEndsAt]);

  useEffect(() => {
    if (!ownsTimerRef.current || sessionEndsAt === null) return;

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
