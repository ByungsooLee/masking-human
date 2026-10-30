"use client";

import { isSelectableRealtimeModel, type SelectableRealtimeModel } from "@/lib/realtime/model-options";

export function ModelComparisonSettings({ value, en, mockOnly, onChange }: {
  value?: SelectableRealtimeModel;
  en: boolean;
  mockOnly: boolean;
  onChange: (value: SelectableRealtimeModel | undefined) => void;
}) {
  return <details className="border-y border-[color:var(--color-thread)] py-3">
    <summary className="min-h-12 cursor-pointer">{en ? "Operator settings · model comparison" : "運営者設定・モデル比較"}</summary>
    <div className="space-y-3 py-3">
      <label className="flex flex-col gap-2">{en ? "Voice AI for the next interview" : "次の会話で使用する音声AI"}
        <select className="ui-field min-h-12" value={value ?? ""} disabled={mockOnly} onChange={(event) => onChange(isSelectableRealtimeModel(event.target.value) ? event.target.value : undefined)}>
          <option value="">{en ? "Use server configuration (unchanged)" : "サーバー設定を使う（従来どおり）"}</option>
          <option value="gpt-realtime-2.1-mini">{en ? "Mini · lower cost / comparison" : "mini・低コストで比較"}</option>
          <option value="gpt-realtime-2.1">{en ? "Standard · GPT-Realtime-2.1" : "標準・GPT-Realtime-2.1"}</option>
        </select>
      </label>
      <p className="text-sm leading-relaxed">{mockOnly ? (en ? "The demo uses a script and does not test either model." : "デモは台本の再生で、モデルの比較にはなりません。") : (en ? "Applies to a new interview, not an ongoing one. Both use cloud processing. No automatic fallback to a more expensive model. Compare quality as well as cost; savings are not guaranteed." : "新しく始める会話に適用します。端末ではなくクラウドで処理し、会話中の変更や高いモデルへの自動切替はしません。料金だけでなく会話の質も比較してください。削減率は保証されません。")}</p>
      <p className="text-sm">{en ? "History → API usage per response shows the actual model, estimated cost and usage JSON. Transcription costs are not included." : "履歴の「返答ごとのAPI利用量」で、実際の使用モデル・推定料金・利用量JSONを確認できます。文字起こし費用は含みません。"}</p>
    </div>
  </details>;
}
