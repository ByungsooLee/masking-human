"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsageSummary } from "@/lib/usage/types";

export function useUsageSummary(sessionId: string | null, pollMs = 30_000) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
    try {
      const res = await fetch(`/api/usage/summary${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Usage unavailable");
      setSummary((await res.json()) as UsageSummary);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const id = setInterval(() => void refresh(), pollMs);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { summary, loading, error, refresh };
}
