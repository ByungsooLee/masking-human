"use client";

import Link from "next/link";
import { SessionCostBadge } from "@/components/usage/session-cost-badge";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import type { MagazineFlowPhase } from "@/lib/magazine-flow/types";

type Props = {
  phase: MagazineFlowPhase;
  showBack?: boolean;
  onBack?: () => void;
  sessionEstimatedUsd: number | null;
  pricingConfigured: boolean;
  showCost: boolean;
};

export function FlowChrome({
  phase,
  showBack,
  onBack,
  sessionEstimatedUsd,
  pricingConfigured,
  showCost,
}: Props) {
  const ui = getMagazineFlowUi();
  return (
    <header className="recording-exclude shrink-0 border-b border-[color:var(--color-thread)] bg-[rgb(255_255_255/0.8)] px-[var(--space-page-x)] py-3">
      <nav className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 text-[length:var(--text-body)]">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/live" className="font-medium text-[color:var(--color-rose)]">
            {ui.appName}
          </Link>
          <Link href="/live/archive" className="text-[color:var(--color-ink-muted)]">
            {ui.archiveLink}
          </Link>
          <Link href="/usage" className="text-[color:var(--color-ink-muted)]">
            {ui.usageLink}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {showCost && (
            <SessionCostBadge
              inline
              estimatedUsd={sessionEstimatedUsd}
              pricingConfigured={pricingConfigured}
            />
          )}
          {showBack && onBack && phase !== "prepare" && phase !== "slate" && phase !== "conversation" && (
            <button type="button" onClick={onBack} className="ui-btn-sub py-1">
              {ui.back}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
