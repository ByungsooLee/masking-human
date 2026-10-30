"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import { PrimaryNavigation } from "@/components/primary-navigation";
import { SessionCostBadge } from "@/components/usage/session-cost-badge";
import { PipelineCostPanel } from "@/components/usage/pipeline-cost-panel";
import type { PipelineCost } from "@/lib/pipeline/types";
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
  pipelineMode?: boolean;
  pipelineCost?: PipelineCost | null;
  language?: "ja" | "en";
};

export function FlowChrome({
  phase,
  showBack,
  onBack,
  sessionEstimatedUsd,
  pricingConfigured,
  showCost,
  mockOnly = false,
  pipelineMode = false,
  pipelineCost = null,
  language = "ja",
}: Props) {
  const t = useUiTranslator();
  const ui = useMagazineFlowUi();
  return (
    <header className="recording-exclude sticky top-0 z-40 shrink-0 border-b border-[color:var(--color-thread)] bg-[rgb(255_255_255/0.96)] px-[var(--space-page-x)] py-3">
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
          {showCost && !mockOnly && pipelineMode && <PipelineCostPanel cost={pipelineCost} en={language === "en"} live />}
          {showCost && (mockOnly || !pipelineMode) && (
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
