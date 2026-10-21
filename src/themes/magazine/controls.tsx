"use client";

import { connectionStatusLabel } from "@/lib/i18n/live-ui";
import type { ThemeControlsProps } from "@/themes/types";

export function MagazineControls({
  copy,
  connectionStatus,
  error,
  onStart,
  onStartDemo,
  onStop,
  isMockSession,
  showDemoStart,
  mockOnly,
  sessionRemainingLabel,
  budgetBlocked,
  budgetWarning,
  budgetMessage,
}: ThemeControlsProps) {
  const idle = connectionStatus === "idle" || connectionStatus === "error";
  const canStartInterview = idle && !budgetBlocked && !mockOnly;
  const canStartDemo = idle && showDemoStart && onStartDemo;
  const canStop =
    connectionStatus === "connected" || connectionStatus === "connecting";

  return (
    <footer className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ground)]">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-2 px-[var(--space-page-x)] py-5">
        {budgetWarning && budgetMessage && !isMockSession && (
            <p className="text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]">{budgetMessage}</p>
        )}
        {budgetBlocked && budgetMessage && !isMockSession && (
            <p className="text-[length:var(--text-body)] text-[color:var(--color-ink)]">{budgetMessage}</p>
        )}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]">
              {connectionStatusLabel(copy, connectionStatus, isMockSession)}
            </p>
            {sessionRemainingLabel && (
              <p className="text-[length:var(--text-stage-caption)] text-[color:var(--color-mist)]">
                {sessionRemainingLabel}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {canStartInterview && (
              <button
                type="button"
                onClick={onStart}
                className="border border-[color:var(--color-ink)] bg-transparent px-4 py-2 text-[length:var(--text-body)] text-[color:var(--color-ink)]"
              >
                {copy.startInterview}
              </button>
            )}
            {canStartDemo && (
              <button
                type="button"
                onClick={onStartDemo}
                className="border border-[color:var(--color-line)] px-4 py-2 text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]"
              >
                {copy.startDemo}
              </button>
            )}
            {canStop && (
              <button
                type="button"
                onClick={onStop}
                className="border border-[color:var(--color-line)] px-4 py-2 text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]"
              >
                {copy.endInterview}
              </button>
            )}
          </div>
        </div>
        {(error || connectionStatus === "error") && error && (
          <p className="text-[length:var(--text-body)] text-red-800">{error}</p>
        )}
      </div>
    </footer>
  );
}
