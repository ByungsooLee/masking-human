"use client";

import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function useMagazineFlowUi() {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  return getMagazineFlowUi(language);
}
