"use client";

import { useState } from "react";
import { isPricingConfigured } from "../../../config/pricing";
import { RecordingSessionProvider } from "@/contexts/recording-session-context";
import { FlowChrome } from "@/components/magazine-flow/flow-chrome";
import { PhaseConversation } from "@/components/magazine-flow/phase-conversation";
import { PhaseMagazine } from "@/components/magazine-flow/phase-magazine";
import { PhasePrepare } from "@/components/magazine-flow/phase-prepare";
import { PhasePublish } from "@/components/magazine-flow/phase-publish";
import { PhaseReview } from "@/components/magazine-flow/phase-review";
import { PhaseSlate } from "@/components/magazine-flow/phase-slate";
import { DEFAULT_REALTIME_MODEL } from "@/lib/realtime/config";
import { bloomFontClassName } from "@/themes/bloom/fonts";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

type Props = { mockOnly: boolean };

function MagazineFlowInner({ mockOnly: mockFromUrl }: Props) {
  const phase = useMagazineFlowStore((s) => s.phase);
  const [demoChosen, setDemoChosen] = useState(false);
  const [prevPhase, setPrevPhase] = useState(phase);
  if (prevPhase !== phase) {
    setPrevPhase(phase);
    if (phase === "prepare") setDemoChosen(false);
  }
  const mockOnly = mockFromUrl || demoChosen;
  const goBack = useMagazineFlowStore((s) => s.goBack);
  const sessionEstimatedUsd = useRealtimeInterviewStore((s) => s.sessionEstimatedUsd);

  const showBack =
    phase === "slate" ||
    phase === "conversation" ||
    phase === "review" ||
    phase === "magazine" ||
    phase === "publish";
  const showCost = phase === "conversation";

  return (
    <div data-theme="bloom" className={`${bloomFontClassName} bloom-ground theme-body flex min-h-screen flex-col`}>
      <FlowChrome
        phase={phase}
        showBack={showBack}
        onBack={goBack}
        sessionEstimatedUsd={sessionEstimatedUsd}
        pricingConfigured={isPricingConfigured(DEFAULT_REALTIME_MODEL)}
        showCost={showCost}
      />
      <main className="flex-1">
        {phase === "prepare" && <PhasePrepare mockOnly={mockOnly} onStartDemo={() => setDemoChosen(true)} />}
        {phase === "slate" && <PhaseSlate mockOnly={mockOnly} />}
        {phase === "conversation" && <PhaseConversation mockOnly={mockOnly} />}
        {phase === "review" && <PhaseReview />}
        {phase === "magazine" && <PhaseMagazine />}
        {phase === "publish" && <PhasePublish />}
      </main>
    </div>
  );
}

export function MagazineFlow(props: Props) {
  return (
    <RecordingSessionProvider>
      <MagazineFlowInner {...props} />
    </RecordingSessionProvider>
  );
}
