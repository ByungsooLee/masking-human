"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsageSummary } from "@/lib/usage/types";

export function useUsageSummary(sessionId: string | null, pollMs = 30_000) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    const res = await fetch(`/api/usage/summary${q}`);
    if (res.ok) {
      setSummary((await res.json()) as UsageSummary);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { summary, loading, refresh };
}
