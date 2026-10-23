"use client";

import { useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { buildMindMapText, buildSelfAnalysisMap, type AnalysisNode } from "@/lib/graph/self-analysis-map";
import type { Utterance } from "@/lib/realtime/types";
import { downloadDataUrl, downloadText } from "@/lib/magazine-flow/export-png";

type Props = {
  utterances: readonly (Utterance & { excluded?: boolean })[];
  guestName?: string;
  language?: "ja" | "en";
  onSeek?: (startedAt: number, id: string) => void;
  showStory?: boolean;
  live?: boolean;
  allowDownloads?: boolean;
};

export function SelfAnalysisMap({ utterances, guestName, language = "ja", onSeek, showStory = true, live = false, allowDownloads = true }: Props) {
  const map = useMemo(() => buildSelfAnalysisMap(utterances), [utterances]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRelations, setShowRelations] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = useId().replaceAll(":", "");
  const ja = language === "ja";
  const name = guestName?.trim() || (ja ? "自分" : "Self");
  const selected = map.nodes.find((node) => node.id === selectedId);
  const related = map.relations.filter((relation) => relation.source === selectedId || relation.target === selectedId);
  const positions = new Map<string, { x: number; y: number }>();
  map.categories.forEach((category, categoryIndex) => {
    category.nodes.forEach((node, nodeIndex) => {
      positions.set(node.id, { x: categoryIndex < 2 ? 140 : 1060, y: (categoryIndex < 2 ? 230 + categoryIndex * 320 : 140 + (categoryIndex - 2) * 280) + (nodeIndex - (category.nodes.length - 1) / 2) * 48 });
    });
  });

  const select = (node: AnalysisNode) => setSelectedId((current) => current === node.id ? null : node.id);
  const saveSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const originals = [svg, ...svg.querySelectorAll("*")];
    const copies = [copy, ...copy.querySelectorAll("*")];
    originals.forEach((element, index) => {
      const style = getComputedStyle(element);
      for (const property of ["fill", "stroke", "font-family", "font-size", "font-weight"]) {
        (copies[index] as SVGElement).style.setProperty(property, style.getPropertyValue(property));
      }
    });
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" }));
    downloadDataUrl("self-analysis-map.svg", url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="self-analysis-map" data-live={live} aria-label={ja ? "自己分析マインドマップ" : "Self reflection mind map"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[length:var(--text-lead)]">{live ? (ja ? "マインドマップ" : "Mind map") : ja ? `${guestName?.trim() || "コスメ"}から紐解く自分の軸` : "What shapes me"}</h2>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{ja ? "コスメのこだわりから、なりたい自分と価値観へ。言葉を選ぶと元の発言が開きます。" : "From cosmetic preferences to your desired self and values. Select a word to see its source."}</p>
      </div>
      <div className="recording-exclude flex flex-wrap gap-2">
        <button type="button" className="ui-btn-sub" aria-pressed={zoomed} onClick={() => setZoomed((current) => !current)}>{zoomed ? (ja ? "全体表示" : "Fit") : (ja ? "拡大表示" : "Zoom")}</button>
        <button type="button" className="ui-btn-sub" aria-pressed={showRelations} onClick={() => setShowRelations((current) => !current)}>{ja ? "本人が語った因果" : "Stated reasons"}</button>
        {!live && allowDownloads && <button type="button" className="ui-btn-sub" onClick={saveSvg}>{ja ? "図を保存" : "Save SVG"}</button>}
        {!live && allowDownloads && <button type="button" className="ui-btn-sub" onClick={() => downloadText("self-analysis-map.txt", buildMindMapText(map, name, language), "text/plain;charset=utf-8")}>{ja ? "ツリーを保存" : "Save tree"}</button>}
      </div>
    </div>
    <div className="map-canvas-wrap mt-4 overflow-x-auto rounded-2xl bg-[color:var(--color-milk)]">
      <svg ref={svgRef} viewBox="0 0 1200 960" width="1200" height="960" className={`h-auto w-full ${zoomed ? "min-w-[1000px]" : ""}`} role="group" aria-label={ja ? "自分を中心に5つの軸を持つマインドマップ" : "Five branches around the self"}>
        <title>{name} — {ja ? "自己分析マインドマップ" : "Self reflection mind map"}</title>
        <desc>{ja ? "ゲストの原文にある語句のみを重複なく配置。矢印は明示された理由の候補。雲形は本人が最重要と語った価値観です。" : "Unique phrases from guest speech. Arrows show explicit stated reasons, not inferred co-occurrence."}</desc>
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--color-rose, #a33b60)" /></marker></defs>
        <rect width="1200" height="960" rx="24" fill="var(--color-milk, #f8faf9)" />
        <text x="40" y="38" fontSize="16" fill="var(--color-ink-muted, #685860)">{ja ? "★ 大切さの表現　雲形：最重要と語った軸　矢印：本人が語った理由（要確認）" : "★ Expressed importance   Cloud: stated core   Arrows: stated reasons, verify sources"}</text>
        {map.relations.filter((relation) => showRelations || relation.source === selectedId || relation.target === selectedId).map((relation) => {
          const source = positions.get(relation.source)!;
          const target = positions.get(relation.target)!;
          return <path key={`${relation.source}-${relation.target}`} d={`M${source.x} ${source.y} C580 ${source.y - 100} 620 ${target.y - 100} ${target.x} ${target.y}`} fill="none" stroke="var(--color-rose, #a33b60)" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.35" markerEnd={`url(#${markerId})`} />;
        })}
        {map.categories.map((category, index) => {
          const left = index < 2;
          const categoryX = left ? 380 : 820;
          const categoryY = left ? 230 + index * 320 : 140 + (index - 2) * 280;
          const branchColor = `var(--color-map-${category.id}, #92536b)`;
          return <g key={category.id}>
            <path key={live ? category.nodes.map((node) => `${node.id}:${node.evidenceIds.join(",")}`).join("|") : "branch"} className={live ? "map-branch-live" : undefined} pathLength="1" d={`M${left ? 532 : 668} 420 C${left ? 450 : 750} 420 ${categoryX} ${categoryY + 20} ${categoryX} ${categoryY + 20}`} fill="none" stroke={branchColor} strokeWidth="3" />
            <path d={`M${categoryX - 86} ${categoryY + 20} H${categoryX + 86}`} stroke={branchColor} strokeWidth="3" />
            <text x={categoryX} y={categoryY + 6} textAnchor="middle" fontSize={ja ? "20" : "15"} fill="var(--color-ink, #362f32)">{ja ? category.label : category.en}</text>
            {!category.nodes.length && <text x={left ? 140 : 1060} y={categoryY + 6} textAnchor="middle" fontSize="16" fill="var(--color-ink-muted, #685860)">{ja ? "まだ語られていません" : "Not yet discussed"}</text>}
            {category.nodes.map((node) => {
              const position = positions.get(node.id)!;
              return <g key={live ? `${node.id}:${node.evidenceIds.join(",")}:${node.important}` : node.id} role="button" tabIndex={0} aria-label={`${ja ? category.label : category.en}：${node.label}${node.important ? " ★" : ""} ${node.evidenceIds.length}${ja ? "件の発言" : " source turns"}`} aria-pressed={selectedId === node.id}
                onClick={() => select(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(node); } }} className={`map-node cursor-pointer ${live ? "map-node-live" : ""}`}>
                <path d={`M${categoryX + (left ? -86 : 86)} ${categoryY + 20} Q${left ? 245 : 955} ${categoryY + 20} ${position.x + (left ? 90 : -90)} ${position.y + 14}`} fill="none" stroke={branchColor} strokeWidth="1.5" pointerEvents="none" />
                {live && <ellipse className="map-node-halo" cx={position.x} cy={position.y} rx="96" ry="27" fill="none" stroke={branchColor} strokeWidth="3" pointerEvents="none" aria-hidden="true" />}
                <g className="map-word-content">
                <rect x={position.x - 95} y={position.y - 24} width="190" height="48" rx="10" fill={selectedId === node.id ? "var(--color-blush, #f3e8ed)" : "transparent"} stroke={selectedId === node.id ? branchColor : "none"} />
                {node.id === map.coreNodeId && <path transform={`translate(${position.x - 95} ${position.y - 24})`} d="M18 40 C0 40 0 14 18 14 C16 0 48 -2 57 9 C70 -3 104 -2 113 8 C137 -1 167 1 170 14 C193 12 198 39 178 40 Z" fill="var(--color-blush, #f3e8ed)" stroke={branchColor} strokeWidth="1.5" pointerEvents="none" />}
                {node.id !== map.coreNodeId && <path d={`M${position.x - 90} ${position.y + 14} H${position.x + 90}`} stroke={branchColor} strokeWidth="1.5" pointerEvents="none" />}
                <text x={position.x} y={position.y + 6} textAnchor="middle" fontSize="18" fill="var(--color-ink, #362f32)">{node.important ? "★ " : ""}{node.label}</text>
                </g>
              </g>;
            })}
          </g>;
        })}
        <rect x="532" y="372" width="136" height="96" rx="44" fill="var(--color-ground, #fff)" stroke="var(--color-rose, #a33b60)" strokeWidth="2" />
        <text x="600" y="405" textAnchor="middle" fontSize="16" fill="var(--color-ink, #362f32)">{guestName?.trim() ? `${name.length > 6 ? `${name.slice(0, 6)}…` : name}${ja ? "から" : ""}` : (ja ? "コスメから" : "Cosmetics")}</text>
        <text x="600" y="439" textAnchor="middle" fontSize="24" fill="var(--color-ink, #362f32)">{ja ? "自分の軸" : "My values"}</text>
        <text x="40" y="850" fontSize="18" fill="var(--color-ink-muted)">{map.coreNodeId ? (ja ? "雲形：重要なコア軸（本人の明示表現）" : "Cloud: explicitly stated core value") : (ja ? "最も重要なコア軸：未確認" : "Most important core value: unconfirmed")}</text>
        <text x="40" y="935" fontSize="15" fill="var(--color-ink-muted, #685860)">{ja ? "発言からの表現候補を各枝4語まで整理。心理診断・能力の評価ではありません。" : "Up to four expression candidates per branch. Not a psychological or ability assessment."}</text>
      </svg>
    </div>
    <div className="map-mobile-list recording-exclude" aria-label={ja ? "カテゴリ別に読む" : "Read by category"}>
      {map.categories.map((category) => <details key={category.id} style={{ "--branch-color": `var(--color-map-${category.id})` } as CSSProperties}>
        <summary>{ja ? category.label : category.en} ({category.nodes.length})</summary>
        <div className="flex flex-wrap gap-3 pb-4">
          {category.nodes.map((node) => <button key={node.id} type="button" aria-pressed={selectedId === node.id} onClick={() => select(node)}>{node.important ? "★ " : ""}{node.label}</button>)}
          {!category.nodes.length && <p>{ja ? "まだ語られていません" : "Not yet discussed"}</p>}
        </div>
      </details>)}
    </div>
    {selected && <section className="recording-exclude mt-4 rounded-xl border border-[color:var(--color-thread)] p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3"><h3>{selected.important ? "★ " : ""}{selected.label}</h3><button type="button" className="ui-btn-sub" onClick={() => setSelectedId(null)}>{ja ? "閉じる" : "Close"}</button></div>
      {map.guests.filter((row) => selected.evidenceIds.includes(row.id)).map((row) => <blockquote key={row.id} className="mt-3 border-l-2 border-[color:var(--color-rose)] pl-3">
        <p>{row.text}</p>
        {onSeek && <button type="button" className="mt-2 underline" onClick={() => onSeek(row.startedAt, row.id)}>{ja ? "この発言を聞く" : "Play this turn"}</button>}
      </blockquote>)}
      {related.map((relation) => <p key={`${relation.source}-${relation.target}`} className="mt-3 text-sm">[{ja ? "因果：" : "Reason: "}{map.nodes.find((node) => node.id === relation.source)?.label} ➔ {map.nodes.find((node) => node.id === relation.target)?.label}] “{relation.quote}”</p>)}
    </section>}
    {showStory && <section className="mt-6" aria-label="ストーリーの繋がり">
      <h3>{ja ? "ストーリーの繋がり（3行要約）" : "Story connections"}</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-6">{map.storyLines.map((line, index) => <li key={index}>{ja ? line : map.relations[index] ? `Guest-stated reason: “${map.relations[index].quote}” [${map.relations[index].evidenceIds.join(", ")}]` : "Causality is unconfirmed. Ask the guest about their reasons."}</li>)}</ol>
    </section>}
    {!live && <details className="recording-exclude mt-4"><summary className="cursor-pointer">{ja ? "ツリーと根拠をテキストで読む" : "Read the tree and sources"}</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{buildMindMapText(map, name, language)}</pre></details>}
    <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">{ja ? "追加のAI課金なしで、ゲスト自身の表現を整理した候補です。文脈や否定を取り違える場合があります。根拠を確認し、本人の解釈を優先してください。" : "Local extraction from guest expressions, with no additional AI calls. Context and negation can be misread; check the sources with the guest."}</p>
  </section>;
}
