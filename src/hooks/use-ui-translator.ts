"use client";

import { translateInterfaceText } from "@/lib/i18n/interface-text";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function useUiTranslator() {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  return (text: string) => translateInterfaceText(text, language);
}
