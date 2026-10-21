"use client";

import Link from "next/link";
import { useRef } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SessionCostBadge } from "@/components/usage/session-cost-badge";
import { useLiveStage } from "@/contexts/live-stage-context";
import { useParticipantStill } from "@/hooks/use-participant-still";
import type { LiveUiCopy } from "@/lib/i18n/live-ui";
import type { MagazineLayoutVariant } from "@/lib/live/live-stage-types";
import type { ThemeId } from "@/themes/types";

export type MagazineLayoutMode = MagazineLayoutVariant | "toggle" | "hidden";

type Props = {
  copy: LiveUiCopy;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  mockOnly: boolean;
  magazineLayoutMode: MagazineLayoutMode;
  lockMagazineTheme?: boolean;
  camera: {
    devices: MediaDeviceInfo[];
    deviceId: string;
    setDeviceId: (id: string) => void;
    error: string | null;
    previewActive: boolean;
    onEnablePreview: () => void;
  };
  sessionEstimatedUsd: number | null;
  pricingConfigured: boolean;
  showCost: boolean;
  onRecordStart: () => void;
  onRecordStop: () => void;
  recording: boolean;
  recordBlob: Blob | null;
  onDownloadRecord: () => void;
  footer: React.ReactNode;
};

export function LiveControlPanel({
  copy,
  themeId,
  onThemeChange,
  mockOnly,
  magazineLayoutMode,
  lockMagazineTheme = false,
  camera,
  sessionEstimatedUsd,
  pricingConfigured,
  showCost,
  onRecordStart,
  onRecordStop,
  recording,
  recordBlob,
  onDownloadRecord,
  footer,
}: Props) {
  const {
    aspect,
    setAspect,
    panelVisible,
    mediaMode,
    setMediaMode,
    setStillUrl,
    setUseDemoPhoto,
    videoRef,
  } = useLiveStage();
  const { captureFromVideo, readFile } = useParticipantStill();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!panelVisible) {
    return (
      <p
        className="recording-exclude fixed bottom-2 left-1/2 z-30 -translate-x-1/2 text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]"
        aria-live="polite"
      >
        {copy.panelHiddenHint}
      </p>
    );
  }

  return (
    <div className="recording-exclude shrink-0 border-b border-[color:var(--color-line)]">
      <header className="theme-ground border-b border-[color:var(--color-line)] px-[var(--space-page-x)] py-3">
        <nav className="mx-auto flex max-w-[var(--content-max)] flex-wrap gap-4 text-[length:var(--text-body)]">
          <Link href="/live">{copy.headerTitle}</Link>
          <Link href="/usage" className="text-[color:var(--color-ink-muted)]">
            Usage
          </Link>
          <Link href="/" className="text-[color:var(--color-ink-muted)]">
            Text
          </Link>
          <Link href="/voice" className="text-[color:var(--color-ink-muted)]">
            Voice
          </Link>
        </nav>
      </header>

      <div className="theme-ground px-[var(--space-page-x)] py-3">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-3">
          <p className="text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]">
            {copy.panelVisibleHint}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!lockMagazineTheme && (
              <ThemeSwitcher copy={copy} themeId={themeId} onChange={onThemeChange} />
            )}
            {lockMagazineTheme && (
              <span className="border border-[color:var(--color-ink)] px-3 py-1 text-[length:var(--text-body)]">
                {copy.themeMagazine}
              </span>
            )}
            <button
              type="button"
              aria-pressed={aspect === "9:16"}
              onClick={() => setAspect("9:16")}
              className="border border-[color:var(--color-line)] px-2 py-1 text-[length:var(--text-body)]"
            >
              {copy.aspectPortrait}
            </button>
            <button
              type="button"
              aria-pressed={aspect === "16:9"}
              onClick={() => setAspect("16:9")}
              className="border border-[color:var(--color-line)] px-2 py-1 text-[length:var(--text-body)]"
            >
              {copy.aspectLandscape}
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 text-[length:var(--text-body)]">
            <label className="flex flex-col gap-1">
              {copy.cameraLabel}
              <select
                value={camera.deviceId}
                onChange={(e) => camera.setDeviceId(e.target.value)}
                className="max-w-[14rem] border border-[color:var(--color-line)] bg-transparent px-2 py-1"
              >
                {camera.devices.length === 0 && <option value="">—</option>}
                {camera.devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || copy.cameraLabel}
                  </option>
                ))}
              </select>
            </label>
            {!camera.previewActive && (
              <button
                type="button"
                onClick={camera.onEnablePreview}
                className="border border-[color:var(--color-line)] px-3 py-1"
              >
                {copy.mediaModeVideo}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (v) {
                  const url = captureFromVideo(v);
                  if (url) {
                    setStillUrl(url);
                    setMediaMode("still");
                    setUseDemoPhoto(false);
                  }
                }
              }}
              className="border border-[color:var(--color-line)] px-3 py-1"
            >
              {copy.captureStill}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border border-[color:var(--color-line)] px-3 py-1"
            >
              {copy.uploadPhoto}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await readFile(file);
                if (url) {
                  setStillUrl(url);
                  setMediaMode("still");
                  setUseDemoPhoto(false);
                }
              }}
            />
            {(mockOnly || themeId === "magazine") && (
              <button
                type="button"
                onClick={() => {
                  setUseDemoPhoto(true);
                  setMediaMode("still");
                  setStillUrl(null);
                }}
                className="border border-[color:var(--color-line)] px-3 py-1"
              >
                {copy.useDemoPhoto}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMediaMode("none");
                setStillUrl(null);
                setUseDemoPhoto(false);
              }}
              className="border border-[color:var(--color-line)] px-3 py-1"
            >
              {copy.mediaModeTextOnly}
            </button>
            <span className="text-[color:var(--color-ink-muted)]">
              {mediaMode === "video"
                ? copy.mediaModeVideo
                : mediaMode === "still"
                  ? copy.mediaModeStill
                  : copy.mediaModeTextOnly}
              {camera.error ? ` (${copy.connectionFailed})` : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <button
                type="button"
                onClick={onRecordStart}
                className="border border-[color:var(--color-line)] px-3 py-1 text-[length:var(--text-body)]"
              >
                {copy.recordStageStart}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRecordStop}
                className="border border-[color:var(--color-line)] px-3 py-1 text-[length:var(--text-body)]"
              >
                {copy.recordStageStop}
              </button>
            )}
            {recordBlob && (
              <button
                type="button"
                onClick={onDownloadRecord}
                className="border border-[color:var(--color-line)] px-3 py-1 text-[length:var(--text-body)]"
              >
                {copy.recordStageDownload}
              </button>
            )}
            {showCost && (
              <SessionCostBadge
                inline
                estimatedUsd={sessionEstimatedUsd}
                pricingConfigured={pricingConfigured}
              />
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}
