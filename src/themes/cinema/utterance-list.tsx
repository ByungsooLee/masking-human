"use client";

import { useEffect, useRef } from "react";
import type { ThemeUtteranceListProps } from "@/themes/types";
import { isClimaxGuestUtterance } from "@/themes/shared/quote-feature";
import { CinemaUtteranceBlock } from "./utterance-block";

export function CinemaUtteranceList({ copy, utterances }: ThemeUtteranceListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastGuest = [...utterances].reverse().find((u) => u.speaker === "guest");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [utterances]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col justify-end px-[var(--space-page-x)] py-[var(--space-stage-pad)]">
      <div className="mx-auto w-full max-w-[var(--content-max)]">
        {utterances.length === 0 ? (
          <p className="text-center text-sm text-[color:var(--color-ink-muted)]">{copy.emptyTranscript}</p>
        ) : (
          lastGuest && (
            <CinemaUtteranceBlock
              utterance={lastGuest}
              isClimax={isClimaxGuestUtterance(lastGuest, utterances)}
            />
          )
        )}
        <div ref={endRef} aria-hidden />
      </div>
    </div>
  );
}
