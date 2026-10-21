"use client";

import { useLiveStage } from "@/contexts/live-stage-context";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  stageRef?: React.RefObject<HTMLDivElement | null>;
};

export function LiveStage({ children, stageRef }: Props) {
  const { aspect, accentColor } = useLiveStage();
  const ratio = aspect === "9:16" ? "9 / 16" : "16 / 9";

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-[color:var(--color-stage-letterbox,#1a1a1a)] p-[var(--space-stage-pad,1rem)]">
      <div
        ref={stageRef}
        id="live-stage"
        data-aspect={aspect}
        className="theme-ground relative flex h-auto w-full max-w-full flex-col overflow-hidden"
        style={{
          aspectRatio: ratio,
          maxHeight: "min(85vh, calc(100vw * 16 / 9))",
          maxWidth: aspect === "9:16" ? "min(100%, calc(85vh * 9 / 16))" : "min(100%, 960px)",
          ...(accentColor ? { "--color-accent": accentColor } : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}
