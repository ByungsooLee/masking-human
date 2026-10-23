"use client";

import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function DemoNotice() {
  const en = useMagazineFlowStore((state) => state.prepare.language) === "en";
  return <aside role="note" className="border-b bg-amber-50 px-5 py-3 text-sm text-stone-900">
    {en
      ? "Demo only — sample conversation and synthetic audio. Do not use for real recording or consent, or enter personal information. APIs, signature saving and email are disabled. History stays in this browser and does not sync to another Mac."
      : "動作確認専用デモ：用意した会話と合成音声を使用します。実際の収録・同意取得には使わず、個人情報を入力しないでください。API・署名保存・メール送信は無効です。履歴はこのブラウザ内だけに残り、別のMacとは同期しません。"}
  </aside>;
}
