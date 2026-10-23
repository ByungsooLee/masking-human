"use client";

import { useUiTranslator } from "@/hooks/use-ui-translator";

import { useMemo } from "react";
import type { Utterance } from "@/lib/realtime/types";
import type { MagazineDraft } from "@/lib/magazine-flow/types";
import { buildAnalyticsReport } from "@/lib/graph/analytics-report";
import { downloadText } from "@/lib/magazine-flow/export-png";
import { SelfAnalysisMap } from "./self-analysis-map";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

type Props = { utterances: readonly (Utterance & { excluded?: boolean })[]; guestName?: string; draft?: MagazineDraft | null; recordedAt?: number | null; onSeek?: (time: number, id: string) => void; allowDownloads?: boolean };

function point(index: number, radius: number) {
  const angle = index * Math.PI * 2 / 5 - Math.PI / 2;
  return [180 + Math.cos(angle) * radius, 160 + Math.sin(angle) * radius];
}

export function AnalyticsMagazineReport({ utterances, guestName, draft, recordedAt, onSeek, allowDownloads = true }: Props) {
  const t = useUiTranslator();
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const report = useMemo(() => buildAnalyticsReport(utterances, null, language), [utterances, language]);
  const quote = draft?.heroQuote && report.map.guests.some((row) => row.id === draft.heroQuote.utteranceId && row.text.includes(draft.heroQuote.text))
    ? draft.heroQuote.text : report.map.guests.find((row) => /大切|大事/.test(row.text))?.text ?? report.map.guests[0]?.text;
  const date = recordedAt ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(recordedAt)) : t("収録日未記録");
  return <article className="analytics-magazine" aria-label={t("総合アナリティクス・マガジンレポート")}>
    <header>
      <p className="report-caption">{t("手入れの記憶 /")}{date} {t("/ インタビューレポート")}</p>
      <h2 className="report-title">{draft?.title || t("コスメから紐解く自分の軸")}</h2>
      {draft?.lead && <p>{draft.lead}</p>}
      {quote ? <blockquote className="report-quote"><span aria-hidden="true">“</span><p>{quote}</p><span aria-hidden="true">”</span></blockquote> : <p>{t("会話が記録されると、本人の言葉がここに表示されます。")}</p>}
    </header>
    <section className="report-section">
      <h3>{t("思考の構成・アナリティクス")}</h3>
      <p>{t("数値は発言の言及率であり、能力・感情の安定度・共感性の評価ではありません。0は「言及なし」を意味します。")}</p>
      <h4>{t("思考密度 — 表示ノードの構成比")}</h4>
      <p>{t("図に配置された語の割合です。関心・意識の強さを直接測るものではなく、各枝4語の表示上限にも影響されます。")}</p>
      <table className="report-table"><thead><tr><th>{t("カテゴリ")}</th><th>{t("ノード数")}</th><th>{t("構成比")}</th></tr></thead><tbody>{report.density.map((category) => <tr key={category.id}><th scope="row">{category.label}</th><td>{category.count}</td><td>{category.percentage === null ? t("未算出") : <><meter min="0" max="100" value={category.percentage} aria-label={`${category.label}のノード構成比`} /> {category.percentage}%</>}</td></tr>)}</tbody></table>
      <h4>{t("動機ベクトル — 表現の構成比")}</h4>
      <p>{t("本人の動機の確定ではなく、辞書に合った表現の割合です。同じ発言が両方向に含まれる場合は各1件として数えます。")}</p>
      <table className="report-table"><thead><tr><th>{t("表現")}</th><th>{t("構成比")}</th><th>{t("根拠の発言ID")}</th></tr></thead><tbody>{report.motives.map((motive) => <tr key={motive.id}><th scope="row">{motive.label}</th><td>{motive.percentage === null ? t("未算出") : `${motive.percentage}%`} ({motive.count}{t("件)")}</td><td>{motive.evidenceIds.join(", ") || t("なし")}</td></tr>)}</tbody></table>
      <p className="report-caption">{t("分類対象")}{report.motiveCoverage.classifiedTurnCount}{t("件 / 両方向")}{report.motiveCoverage.bothTurnCount}{t("件 / 未分類")}{report.motiveCoverage.unclassifiedTurnCount}{t("件。未分類は割合の分母から除外します。")}</p>
      <h4>{t("会話の仮タイプ")}</h4><p className="report-topic-title">{report.topicProfile.label}</p><p>{report.topicProfile.observation}</p><p className="report-caption">{report.topicProfile.basis} {report.topicProfile.caution}</p><p>{t("次の振り返り：")}{report.topicProfile.nextQuestion}</p>
      <div className="report-metrics">
        <p>{t("分析対象の発言")}<strong>{report.kpis.guestTurnCount}{t("件")}</strong></p>
        <p>{t("明示された理由の候補")}<strong>{report.kpis.explicitReasonCount}{t("件")}</strong></p>
        <p>{t("アイデンティティ安定度")}<strong>{t("未算出")}</strong></p>
      </div>
      <h4>{t("5軸の価値観関連テーマ — 言及率（0〜100）")}</h4>
      <div className="report-analytics-grid">
        <svg viewBox="0 0 360 330" role="img" aria-label={t("5テーマの言及率。詳細数値と根拠は隣の表に記載。")}>
          {[25, 50, 75, 100].map((level) => <polygon key={level} points={report.axes.map((_axis, index) => point(index, level).join(",")).join(" ")} fill="none" stroke="var(--report-line)" />)}
          {report.axes.map((axis, index) => { const [x, y] = point(index, 136); return <g key={axis.label}><line x1="180" y1="160" x2={point(index, 100)[0]} y2={point(index, 100)[1]} stroke="var(--report-line)" /><text x={x} y={y} textAnchor="middle" fontSize="12" fill="var(--color-ink)">{axis.label}</text></g>; })}
          {report.kpis.guestTurnCount > 0 && <polygon points={report.axes.map((axis, index) => point(index, axis.coverage ?? 0).join(",")).join(" ")} fill="var(--report-sage)" fillOpacity="0.35" stroke="var(--color-rose)" strokeWidth="2" />}
          {!report.kpis.guestTurnCount && <text x="180" y="160" textAnchor="middle">{t("データなし")}</text>}
        </svg>
        <div className="overflow-x-auto"><table className="report-table"><caption>{t("該当発言数 ÷ 分析対象発言数 × 100")}</caption><thead><tr><th>{t("テーマ")}</th><th>{t("言及率")}</th><th>{t("根拠の発言ID")}</th></tr></thead><tbody>{report.axes.map((axis) => <tr key={axis.label}><th scope="row">{axis.description}</th><td>{axis.coverage === null ? t("未算出") : `${axis.coverage}%`} ({axis.count}{t("件)")}</td><td>{axis.evidenceIds.join(", ") || t("なし")}</td></tr>)}</tbody></table></div>
      </div>
      <h4>{t("過去・現在・未来の時間軸")}</h4><p>{t("会話にある語のみを配置しています。列の順序は、世代間の伝播や因果の証明ではありません。")}</p>
      <div className="report-flow">{report.flow.map((stage) => <section key={stage.id}><h5>{stage.label}</h5><p>{stage.nodes.map((node) => node.label).join(" / ") || t("未確認")}</p></section>)}</div>
      <dl className="report-kpis"><dt>{t("価値観タグ")}</dt><dd>{report.kpis.coreValueTags.map((tag) => `#${tag.label}`).join(" ") || t("未確認")}</dd><dt>{t("感情に関わる理由の候補")}</dt><dd>{report.kpis.emotionalDrivers.map((driver) => `${driver.sourceLabel} ➔ ${driver.targetLabel}［${driver.evidenceIds.join(", ")}］`).join(" / ") || t("明示された理由は未確認")}</dd></dl>
    </section>
    <section className="report-section"><h3>{t("5軸ストーリー・因果マインドマップ")}</h3><SelfAnalysisMap utterances={utterances} guestName={guestName} language={language} onSeek={onSeek} showStory={false} allowDownloads={allowDownloads} /></section>
    <section className="report-section"><h3>{t("ストーリーの繋がり")}</h3><ol>{report.map.storyLines.map((line, index) => <li key={index}>{line}</li>)}</ol></section>
    <section className="report-section"><h3>{t("プロンプト構成と分析メタデータ")}</h3><p>{t("ローカル抽出・追加のAI API呼び出しなし。心理診断ではありません。分析日時はJSON保存時に記録します。")}</p><details><summary>{t("算出方法・制約・プロンプト構成を見る")}</summary><pre className="report-metadata">{JSON.stringify(report.metadata, null, 2)}</pre></details>
      {allowDownloads && <p className="report-caption">{t("JSONには発言本文が含まれます。共有先をご確認ください。")}</p>}
      {allowDownloads && <button type="button" className="ui-btn-sub mt-4" onClick={() => downloadText("analytics-magazine-report.json", JSON.stringify({ ...buildAnalyticsReport(utterances, new Date().toISOString(), language), editorial: { title: draft?.title || t("コスメから紐解く自分の軸"), lead: draft?.lead ?? null, quote: quote ?? null, recordedAt: recordedAt ?? null } }, null, 2), "application/json")}>{t("総合レポートをJSONで保存")}</button>}
    </section>
  </article>;
}
