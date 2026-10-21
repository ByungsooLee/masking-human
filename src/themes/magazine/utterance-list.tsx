"use client";

import { MagazineStage } from "./magazine-stage";
import type { ThemeUtteranceListProps } from "@/themes/types";
import { useLiveStageOptional } from "@/contexts/live-stage-context";

type ExtraProps = ThemeUtteranceListProps & {
  listeningPhase?: import("@/lib/realtime/types").ListeningPhase;
  cameraStream?: MediaStream | null;
};

export function MagazineUtteranceList({
  copy,
  utterances,
  listeningPhase = "hidden",
  cameraStream = null,
}: ExtraProps) {
  const stage = useLiveStageOptional();
  if (!stage) {
    return (
      <p className="p-4 text-[length:var(--text-body)]">{copy.emptyTranscript}</p>
    );
  }
  return (
    <MagazineStage
      copy={copy}
      utterances={utterances}
      listeningPhase={listeningPhase}
      cameraStream={cameraStream}
    />
  );
}
