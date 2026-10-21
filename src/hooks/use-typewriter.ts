"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reveals `text` one character at a time; shows it whole when reduced motion is on. */
export function useTypewriter(text: string, msPerChar = 32): string {
  const [state, setState] = useState({ text, count: text.length });

  if (state.text !== text) {
    const kept = state.text.slice(0, state.count);
    const count = prefersReducedMotion() ? text.length : text.startsWith(kept) ? kept.length : 0;
    setState({ text, count });
  }

  const done = state.count >= text.length;

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      setState((s) => (s.count >= s.text.length ? s : { ...s, count: s.count + 1 }));
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [done, text, msPerChar]);

  return text.slice(0, state.count);
}
