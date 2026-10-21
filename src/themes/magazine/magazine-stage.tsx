"use client";

import { useLiveStage } from "@/contexts/live-stage-context";
import type { LiveUiCopy } from "@/lib/i18n/live-ui";
import type { ListeningPhase, Utterance } from "@/lib/realtime/types";
import { MagazineStageCaption } from "./stage-caption";
import { MagazineStageMedia } from "./stage-media";
import { MagazineStageUtterances } from "./stage-utterances";

type Props = {
  copy: LiveUiCopy;
  utterances: Utterance[];
  listeningPhase: ListeningPhase;
  cameraStream: MediaStream | null;
};

export function MagazineStage({ copy, utterances, listeningPhase, cameraStream }: Props) {
  const { layoutVariant, aspect, mediaMode } = useLiveStage();
  const hasMedia = mediaMode !== "none";
  const spread = layoutVariant === "spread";

  const speakCue =
    listeningPhase === "guest_may_speak" ? (
      <p className="text-[length:var(--text-stage-caption)] text-[color:var(--color-ink-muted)]">
        {copy.speakNow}
      </p>
    ) : listeningPhase === "ai_speaking" ? (
      <p className="text-[length:var(--text-stage-caption)] text-[color:var(--color-ink-muted)]">
        {copy.speakListening}
      </p>
    ) : null;

  if (spread && aspect === "16:9") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-row">
        {hasMedia && (
          <div className="relative min-h-0 w-[55%] shrink-0">
            <MagazineStageMedia cameraStream={cameraStream} />
            <div className="absolute bottom-[var(--space-stage-pad)] left-[var(--space-stage-pad)]">
              <MagazineStageCaption />
            </div>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-[var(--space-stage-text)] p-[var(--space-stage-pad)]">
          {utterances.length === 0 ? (
            <p className="text-[length:var(--text-stage-body)] text-[color:var(--color-ink-muted)]">
              {copy.emptyTranscript}
            </p>
          ) : (
            <MagazineStageUtterances utterances={utterances} />
          )}
          {speakCue}
        </div>
      </div>
    );
  }

  if (spread && aspect === "9:16") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {hasMedia && (
          <div className="relative min-h-0 flex-[1.1]">
            <MagazineStageMedia cameraStream={cameraStream} />
            <div className="absolute bottom-[var(--space-stage-pad)] left-[var(--space-stage-pad)]">
              <MagazineStageCaption />
            </div>
          </div>
        )}
        <div className="flex shrink-0 flex-col gap-[var(--space-stage-text)] p-[var(--space-stage-pad)]">
          {utterances.length === 0 ? (
            <p className="text-[length:var(--text-stage-body)] text-[color:var(--color-ink-muted)]">
              {copy.emptyTranscript}
            </p>
          ) : (
            <MagazineStageUtterances utterances={utterances} />
          )}
          {speakCue}
        </div>
      </div>
    );
  }

  /* 1 page */
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {hasMedia && (
        <div className="relative min-h-0 flex-[1.35]">
          <MagazineStageMedia cameraStream={cameraStream} />
          <div className="absolute bottom-[var(--space-stage-pad)] left-[var(--space-stage-pad)]">
            <MagazineStageCaption />
          </div>
        </div>
      )}
      <div className="flex shrink-0 flex-col gap-[var(--space-stage-text)] p-[var(--space-stage-pad)]">
        {!hasMedia && utterances.length === 0 && (
          <p className="text-[length:var(--text-stage-body)] text-[color:var(--color-ink-muted)]">
            {copy.emptyTranscript}
          </p>
        )}
        {utterances.length > 0 && <MagazineStageUtterances utterances={utterances} />}
        {speakCue}
      </div>
    </div>
  );
}
