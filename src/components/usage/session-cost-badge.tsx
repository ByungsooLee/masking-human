"use client";

import { formatEstimatedUsd } from "@/lib/i18n/usage-ui";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

type Props = {
  estimatedUsd: number | null;
  pricingConfigured: boolean;
  inline?: boolean;
};

export function SessionCostBadge({ estimatedUsd, pricingConfigured, inline = false }: Props) {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const hideFromRecording = process.env.NEXT_PUBLIC_HIDE_COST_FROM_RECORDING === "1";

  return (
    <div
      className={
        inline
          ? "recording-exclude text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]"
          : "recording-exclude fixed right-3 top-3 z-30 max-w-[min(100vw-1.5rem,20rem)] text-right text-[length:var(--text-body)] text-[color:var(--color-ink-muted)]"
      }
      data-hide-from-recording={hideFromRecording ? "true" : "false"}
      aria-live="polite"
    >
      {pricingConfigured && estimatedUsd !== null ? `${language === "en" ? "Estimate" : "推定"} $${estimatedUsd.toFixed(4)}` : formatEstimatedUsd(estimatedUsd, pricingConfigured, language)}
    </div>
  );
}
