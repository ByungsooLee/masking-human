"use client";

import type { ExportAspect } from "@/lib/magazine-flow/types";
import { quoted } from "@/themes/magazine/layouts/magazine-layout-body";

/** Vertical hero line: scales down so long quotes stay inside the hero band (export-safe, no scroll). */
export function HeroQuote({ text, aspect }: { text: string; aspect: ExportAspect }) {
  const line = quoted(text);
  const chars = Math.max(line.length, 10);
  const cap = aspect === "16:9" ? 3.8 : aspect === "9:16" ? 7.8 : 6.8;
  const fit = Math.min(cap, (aspect === "16:9" ? 200 : 265) / chars);
  return (
    <p className="mag-voice mag-tate mag-hero shrink-0 self-center" style={{ fontSize: `${fit}cqw` }}>
      {line}
    </p>
  );
}
