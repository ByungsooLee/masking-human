"use client";

import { useEffect, useRef } from "react";
import type { ThemeUtteranceListProps } from "@/themes/types";
import { pickFeaturedGuestQuote } from "@/themes/shared/quote-feature";
import { CosmeUtteranceBlock } from "./utterance-block";

export function CosmeUtteranceList({ copy, utterances }: ThemeUtteranceListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const featured = pickFeaturedGuestQuote(utterances);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [utterances]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-[var(--space-page-x)] py-[var(--space-stage-pad)]">
      <div className="mx-auto max-w-[var(--content-max)] rounded-sm bg-[color:var(--color-frost)] p-6 backdrop-blur-md">
        <h1 className="mb-6 text-[length:var(--text-display)]">{copy.headerTitle}</h1>
        {utterances.length === 0 ? (
          <p className="text-sm text-[color:var(--color-label-ink)]">{copy.emptyTranscript}</p>
        ) : (
          utterances.map((u) => (
            <CosmeUtteranceBlock
              key={u.id}
              utterance={u}
              isClimax={u.speaker === "guest" && featured === u.text}
            />
          ))
        )}
        <div ref={endRef} aria-hidden />
      </div>
    </div>
  );
}
