"use client";

import { useEffect, useState } from "react";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

export function useSessionRemainingLabel(format: (seconds: number) => string): string | null {
  const sessionEndsAt = useRealtimeInterviewStore((s) => s.sessionEndsAt);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (sessionEndsAt === null) {
      setLabel(null);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((sessionEndsAt - Date.now()) / 1000));
      setLabel(format(seconds));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionEndsAt, format]);

  return label;
}
