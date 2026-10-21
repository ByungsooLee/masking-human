"use client";

import type { ThemeSpeakCueProps } from "@/themes/types";

export function CinemaSpeakCue({ copy, listeningPhase }: ThemeSpeakCueProps) {
  if (listeningPhase !== "guest_may_speak") return null;
  return (
    <p className="fixed inset-x-0 bottom-28 z-10 text-center text-xs text-[color:var(--color-ink-muted)]">
      {copy.speakNow}
    </p>
  );
}
