"use client";

import { useCallback, useEffect, useRef } from "react";
import { PipelineInterviewClient } from "@/lib/pipeline/client";
import type { PipelineSettings } from "@/lib/pipeline/types";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

export function usePipelineInterview() {
  const client = useRef<PipelineInterviewClient | null>(null);
  const cleanup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const error = useRealtimeInterviewStore((state) => state.error);
  const start = useCallback(async (options: {
    settings: PipelineSettings; stream: MediaStream; context: AudioContext;
    attachAiAudio: (stream: MediaStream) => void; elapsed: () => number; onTimeLimit: () => void;
  }) => {
    if (client.current) return;
    client.current = new PipelineInterviewClient(options);
    await client.current.start();
  }, []);
  const stop = useCallback(async () => { await client.current?.stop(); }, []);
  const resume = useCallback(async () => { await client.current?.resume(); }, []);
  useEffect(() => {
    if (cleanup.current) clearTimeout(cleanup.current);
    return () => { cleanup.current = setTimeout(() => { void client.current?.stop(); }, 0); };
  }, []);
  return { start, stop, resume, error };
}
