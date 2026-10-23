"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import { PrimaryNavigation } from "@/components/primary-navigation";
import { SessionCostBadge } from "@/components/usage/session-cost-badge";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";
import type { MagazineFlowPhase } from "@/lib/magazine-flow/types";

type Props = {
  phase: MagazineFlowPhase;
  showBack?: boolean;
  onBack?: () => void;
  sessionEstimatedUsd: number | null;
  pricingConfigured: boolean;
  showCost: boolean;
  mockOnly?: boolean;
};

export function FlowChrome({
  phase,
  showBack,
  onBack,
  sessionEstimatedUsd,
  pricingConfigured,
  showCost,
  mockOnly = false,
}: Props) {
  const t = useUiTranslator();
  const ui = useMagazineFlowUi();
  return (
    <header className="recording-exclude shrink-0 border-b border-[color:var(--color-thread)] bg-[rgb(255_255_255/0.8)] px-[var(--space-page-x)] py-3">
      <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 text-[length:var(--text-body)]">
        <PrimaryNavigation confirmLeave={phase !== "prepare"} />
        <div className="flex items-center gap-3">
          {phase !== "prepare" && <a
            href={mockOnly ? "/live?mock=1" : "/live"}
            className="ui-btn-sub inline-flex items-center"
            onClick={(event) => {
              const message = phase === "conversation" || phase === "slate"
                ? t("会話・録音を終了して開始画面に戻ります。未保存の内容は失われます。戻りますか？")
                : t("開始画面に戻ると、未保存の録音・編集内容は失われます。保存済みの履歴は残ります。戻りますか？");
              if (!window.confirm(message)) event.preventDefault();
            }}
          >{t("開始画面に戻る")}</a>}
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
      </div>
    </header>
  );
}
