"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveConsentGate } from "@/components/live/live-consent-gate";
import { LiveControlPanel } from "@/components/live/live-control-panel";
import { LiveStage } from "@/components/live/live-stage";
import { LiveStageProvider } from "@/contexts/live-stage-context";
import { useLiveConsentSession } from "@/hooks/use-live-consent-session";
import { useMockRealtimeInterview } from "@/hooks/use-mock-realtime-interview";
import { useParticipantCamera } from "@/hooks/use-participant-camera";
import { useRealtimeInterview } from "@/hooks/use-realtime-interview";
import { useSessionRemainingLabel } from "@/hooks/use-session-remaining-label";
import { useStageAccent } from "@/hooks/use-stage-accent";
import { useStageRecorder } from "@/hooks/use-stage-recorder";
import { useUsageSummary } from "@/hooks/use-usage-summary";
import { getLiveUiCopy, resolveLiveUiLocale } from "@/lib/i18n/live-ui";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";
import { useLiveStage } from "@/contexts/live-stage-context";
import { getInterviewTheme, type ThemeId } from "@/themes";
import { readStoredTheme, storeTheme } from "@/components/theme-switcher";
import type { MagazineLayoutVariant } from "@/lib/live/live-stage-types";

type Props = {
  themeId?: ThemeId;
  mockOnly?: boolean;
  forcedMagazineLayout?: MagazineLayoutVariant;
  lockMagazineTheme?: boolean;
};

type PendingStart = "live" | "demo" | null;

function LiveInterviewInner({
  themeId: initialTheme,
  mockOnly = false,
  forcedMagazineLayout,
  lockMagazineTheme = false,
}: Props) {
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme ?? "magazine");
  const copy = useMemo(() => getLiveUiCopy(resolveLiveUiLocale()), []);
  const live = useRealtimeInterview();
  const mock = useMockRealtimeInterview();
  const isMockSession = useRealtimeInterviewStore((s) => s.isMockSession);
  const usageSessionId = useRealtimeInterviewStore((s) => s.usageSessionId);
  const sessionEstimatedUsd = useRealtimeInterviewStore((s) => s.sessionEstimatedUsd);

  const active = mockOnly || isMockSession ? mock : live;
  const { summary } = useUsageSummary(usageSessionId);
  const { grantConsents } = useLiveConsentSession();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const { recording, start: startRec, stopAsync, downloadBlob } = useStageRecorder();
  const [recordBlob, setRecordBlob] = useState<Blob | null>(null);
  const [pendingStart, setPendingStart] = useState<PendingStart>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [cameraPreview, setCameraPreview] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);

  const {
    setMediaMode,
    setUseDemoPhoto,
    mediaMode,
    setLayoutVariant,
  } = useLiveStage();

  const camera = useParticipantCamera(cameraPreview && photoConsent);
  useStageAccent(themeId === "magazine");

  useEffect(() => {
    if (lockMagazineTheme) {
      setThemeId("magazine");
      storeTheme("magazine");
    } else {
      setThemeId(readStoredTheme());
    }
  }, [lockMagazineTheme]);

  useEffect(() => {
    if (forcedMagazineLayout) setLayoutVariant(forcedMagazineLayout);
  }, [forcedMagazineLayout, setLayoutVariant]);

  useEffect(() => {
    if (cameraPreview && camera.ready && photoConsent) setMediaMode("video");
  }, [cameraPreview, camera.ready, photoConsent, setMediaMode]);

  const onThemeChange = useCallback((id: ThemeId) => {
    storeTheme(id);
    setThemeId(id);
  }, []);

  const sessionRemainingLabel = useSessionRemainingLabel(
    useCallback((seconds) => copy.sessionRemaining(seconds), [copy]),
  );

  const budgetBlocked = summary?.blocked100 ?? false;
  const budgetWarning = summary?.warning80 ?? false;
  const budgetMessage = budgetBlocked
    ? copy.budgetBlocked
    : budgetWarning
      ? copy.budgetWarning
      : null;

  const theme = getInterviewTheme(themeId);
  const { Layout, UtteranceList, SpeakCue, Controls } = theme;

  const requestStart = useCallback((kind: PendingStart) => {
    setPendingStart(kind);
    setConsentOpen(true);
  }, []);

  const onConsentConfirm = useCallback(
    async (opts: { ai: boolean; photoVideo: boolean; recording: boolean }) => {
      setConsentOpen(false);
      setPhotoConsent(opts.photoVideo);
      if (opts.photoVideo) {
        setCameraPreview(true);
      }
      const ok = await grantConsents({
        ai: opts.ai,
        photoVideo: opts.photoVideo,
        recording: opts.recording,
        needInterviewSession: pendingStart === "live",
      });
      if (!ok && pendingStart === "live") {
        setPendingStart(null);
        return;
      }
      if (pendingStart === "demo") {
        setUseDemoPhoto(true);
        setMediaMode("still");
        void mock.start();
      } else if (pendingStart === "live") {
        void live.start();
      }
      setPendingStart(null);
    },
    [grantConsents, live, mock, pendingStart, setMediaMode, setUseDemoPhoto],
  );

  const wrappedStart = useCallback(() => requestStart("live"), [requestStart]);
  const wrappedDemo = useCallback(() => requestStart("demo"), [requestStart]);

  const showCost =
    active.connectionStatus === "connected" ||
    sessionEstimatedUsd != null ||
    summary?.pricingConfigured === false;

  return (
    <>
      <LiveConsentGate
        copy={copy}
        open={consentOpen}
        needInterviewSession={pendingStart === "live"}
        onConfirm={onConsentConfirm}
        onCancel={() => {
          setConsentOpen(false);
          setPendingStart(null);
        }}
      />
      <div className="flex min-h-screen flex-col">
        <LiveControlPanel
          copy={copy}
          themeId={themeId}
          onThemeChange={onThemeChange}
          mockOnly={mockOnly}
          magazineLayoutMode={
            forcedMagazineLayout ?? (themeId === "magazine" ? "toggle" : "hidden")
          }
          lockMagazineTheme={lockMagazineTheme}
          camera={{
            devices: camera.devices,
            deviceId: camera.deviceId,
            setDeviceId: camera.setDeviceId,
            error: camera.error,
            previewActive: cameraPreview && photoConsent,
            onEnablePreview: () => {
              setPhotoConsent(true);
              setCameraPreview(true);
            },
          }}
          sessionEstimatedUsd={sessionEstimatedUsd}
          pricingConfigured={summary?.pricingConfigured ?? true}
          showCost={showCost}
          recording={recording}
          recordBlob={recordBlob}
          onRecordStart={() => {
            if (startRec(stageRef.current)) setRecordBlob(null);
          }}
          onRecordStop={async () => {
            const blob = await stopAsync();
            if (blob) setRecordBlob(blob);
          }}
          onDownloadRecord={() => {
            if (recordBlob) downloadBlob(recordBlob);
          }}
          footer={
            <Controls
              copy={copy}
              connectionStatus={active.connectionStatus}
              error={active.error}
              onStart={wrappedStart}
              onStartDemo={wrappedDemo}
              onStop={active.stop}
              isLive={active.isLive}
              isMockSession={isMockSession}
              showMockStart={false}
              showDemoStart
              mockOnly={mockOnly}
              sessionRemainingLabel={sessionRemainingLabel}
              budgetBlocked={budgetBlocked}
              budgetWarning={budgetWarning}
              budgetMessage={budgetMessage}
            />
          }
        />
        <LiveStage stageRef={stageRef}>
          <Layout>
            <UtteranceList
              copy={copy}
              utterances={active.utterances}
              listeningPhase={active.listeningPhase}
              cameraStream={
                mediaMode === "video" && photoConsent ? camera.getStream() : null
              }
            />
            <SpeakCue copy={copy} listeningPhase={active.listeningPhase} />
          </Layout>
        </LiveStage>
      </div>
    </>
  );
}

export function LiveInterview(props: Props) {
  return (
    <LiveStageProvider>
      <LiveInterviewInner {...props} />
    </LiveStageProvider>
  );
}
