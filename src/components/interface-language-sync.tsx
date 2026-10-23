"use client";

import { useEffect } from "react";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function InterfaceLanguageSync() {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const restore = useMagazineFlowStore((state) => state.restorePrepareDefaults);
  useEffect(() => { restore(); }, [restore]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "en" ? "Memories of Care" : "手入れの記憶";
  }, [language]);
  return null;
}
