"use client";

import { useLiveStage } from "@/contexts/live-stage-context";

export function MagazineStageCaption() {
  const { caption } = useLiveStage();
  return (
    <div
      className="text-[length:var(--text-stage-caption)] leading-[var(--leading-body)] text-[color:var(--color-ink-muted)]"
      style={{ lineBreak: "strict" }}
    >
      <p>{caption.name}</p>
      <p>{caption.place}</p>
      <p>{caption.date}</p>
    </div>
  );
}
