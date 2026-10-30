import { PDFDocument } from "pdf-lib";
import type { ArchivedSession } from "./session-archive";
import { requireInterviewRelease } from "./participant-handover";
import { describeConversation } from "./conversation-export";
import { buildSelfAnalysisMap } from "@/lib/graph/self-analysis-map";
import { buildAnalysisFindings } from "@/lib/graph/analysis-findings";
import { jpegPagesPdf } from "@/lib/consent/receipt-pdf";

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function combineParticipantPdf(analysisPdf: Uint8Array, receiptPdf: string) {
  const combined = await PDFDocument.create();
  for (const source of [analysisPdf, Uint8Array.from(atob(receiptPdf), (character) => character.charCodeAt(0))]) {
    const document = await PDFDocument.load(source);
    for (const page of await combined.copyPages(document, document.getPageIndices())) combined.addPage(page);
  }
  return toBase64(await combined.save());
}

export async function createParticipantReport(session: ArchivedSession, language: "ja" | "en", createdAt: string): Promise<string> {
  const release = requireInterviewRelease(session);
  await document.fonts.ready;
  const en = language === "en";
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const pages: { jpeg: Uint8Array; width: number; height: number }[] = [];
  let top = 90;
  const reset = () => { context.fillStyle = "#F9F9F7"; context.fillRect(0, 0, 1240, 1754); top = 90; };
  const capture = () => {
    context.fillStyle = "#66615F"; context.font = "18px sans-serif";
    context.fillText(`${en ? "Private copy for participant" : "本人向け・非公開の控え"} / ${pages.length + 1}`, 72, 1700);
    pages.push({ jpeg: Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]), (character) => character.charCodeAt(0)), width: 1240, height: 1754 });
  };
  const text = (value: string, size = 25, color = "#2A2A28") => {
    context.font = `${size}px sans-serif`;
    for (const paragraph of value.split("\n")) {
      let line = "";
      const draw = () => {
        if (top + size * 1.6 > 1620) { capture(); reset(); context.font = `${size}px sans-serif`; }
        context.fillStyle = color; context.fillText(line, 72, top); top += size * 1.6;
      };
      for (const character of paragraph) {
        if (context.measureText(line + character).width > 1096) { draw(); line = ""; }
        line += character;
      }
      draw();
    }
    top += 14;
  };
  reset();
  text(en ? "Your conversation, reflected" : "会話から見つめる、自分の輪郭", 42);
  text(`${release.record.name}${en ? " — personal report" : " 様へのレポート"}`, 28, "#8C6B73");
  text(`${en ? "Interview ID" : "会話ID"}: ${session.id}\n${en ? "Created" : "作成日時"}: ${createdAt}\n${en ? "Consent ID" : "同意ID"}: ${release.record.id}`, 20);
  text(en ? "This is a reflection aid, not a psychological diagnosis. Only edited, non-excluded statements are used. Your own review takes priority. The signed consent receipt is attached at the end." : "心理診断ではなく、今回のお話を振り返るための資料です。修正後・除外されていない発言を対象とし、本人の確認を優先します。末尾に署名済み同意書の控えを添えています。", 24);
  text(en ? "Your words — an extractive summary" : "お話の要約 — あなたの言葉からの抜粋", 30, "#8C6B73");
  const summary = describeConversation(session, en);
  for (const highlight of summary.highlights) text(`“${highlight}”`, 27);
  if (!summary.highlights.length) text(en ? "No guest statements available." : "本人の発言がまだありません。");
  for (const finding of buildAnalysisFindings(session.transcript, language)) {
    const reviews = en ? ["Fits", "Not quite — tentative", "Not sure — tentative"] : ["合っている", "少し違う・未確定", "まだ分からない・未確定"];
    text(finding.title, 28, "#8C6B73"); text(finding.finding, 24);
    text(`${en ? "Your review" : "本人の確認"}: ${!finding.available ? (en ? "Insufficient evidence" : "根拠不足") : reviews[Number(session.analysisFeedback?.[finding.reviewKey])] ?? (en ? "Not reviewed — tentative" : "未回答・未確定")}`, 21);
  }
  capture(); reset();
  text(en ? "A map of your words" : "あなたの言葉のマインドマップ", 38);
  text(en ? "Phrases from this conversation, not fixed traits or ability scores." : "今回語った言葉の整理であり、性格や能力の評価ではありません。", 23);
  const map = buildSelfAnalysisMap(session.transcript);
  const palette = ["#99706D", "#6E8191", "#7B8B70", "#8D7897", "#8C6B73"];
  const positions = new Map<string, { x: number; y: number }>();
  const fitText = (label: string, x: number, y: number, width: number, size = 23) => {
    while (size > 14) { context.font = `${size}px sans-serif`; if (context.measureText(label).width <= width) break; size--; }
    context.fillText(label, x, y);
  };
  context.save(); context.textAlign = "center";
  context.strokeStyle = "#8C6B73"; context.lineWidth = 2;
  context.beginPath(); context.ellipse(620, 690, 108, 60, 0, 0, Math.PI * 2); context.stroke();
  context.fillStyle = "#2A2A28"; fitText(en ? "My words" : "自分の軸", 620, 698, 200, 30);
  map.categories.forEach((category, index) => {
    const left = index < 2;
    const branchX = left ? 375 : 865;
    const branchY = left ? 470 + index * 400 : 350 + (index - 2) * 340;
    const nodeX = left ? 180 : 1060;
    context.strokeStyle = palette[index]; context.lineWidth = 3;
    context.beginPath(); context.moveTo(left ? 512 : 728, 690); context.bezierCurveTo(branchX, 690, branchX, branchY, branchX, branchY); context.stroke();
    context.fillStyle = "#2A2A28"; fitText(en ? category.en : category.label, branchX, branchY - 15, 260, 25);
    if (!category.nodes.length) { context.fillStyle = "#66615F"; fitText(en ? "Not yet discussed" : "まだ語られていません", nodeX, branchY + 45, 210, 19); }
    category.nodes.forEach((node, nodeIndex) => {
      const nodeY = branchY + (nodeIndex - (category.nodes.length - 1) / 2) * 64 + 45;
      positions.set(node.id, { x: nodeX, y: nodeY });
      context.strokeStyle = palette[index]; context.lineWidth = 2;
      context.beginPath(); context.moveTo(branchX, branchY); context.bezierCurveTo(nodeX, branchY, branchX, nodeY + 9, nodeX, nodeY + 9); context.stroke();
      context.fillStyle = "#2A2A28"; fitText(`${node.id === map.coreNodeId ? "★ " : ""}${node.label}`, nodeX, nodeY, 210);
      if (node.id === map.coreNodeId) { context.beginPath(); context.ellipse(nodeX, nodeY - 8, 110, 25, 0, 0, Math.PI * 2); context.stroke(); }
    });
  });
  for (const relation of map.relations) {
    const source = positions.get(relation.source)!; const target = positions.get(relation.target)!;
    context.strokeStyle = "#8C6B73"; context.lineWidth = 1; context.setLineDash([6, 6]);
    context.beginPath(); context.moveTo(source.x, source.y + 15); context.lineTo(target.x, target.y + 15); context.stroke(); context.setLineDash([]);
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    context.beginPath(); context.moveTo(target.x, target.y + 15);
    context.lineTo(target.x - 12 * Math.cos(angle - Math.PI / 6), target.y + 15 - 12 * Math.sin(angle - Math.PI / 6));
    context.moveTo(target.x, target.y + 15);
    context.lineTo(target.x - 12 * Math.cos(angle + Math.PI / 6), target.y + 15 - 12 * Math.sin(angle + Math.PI / 6)); context.stroke();
  }
  context.restore(); top = 1260;
  text(en ? "Word distribution — this conversation only" : "言葉の分布 — 今回の会話内の参考集計", 28, "#8C6B73");
  for (const category of map.categories) {
    text(`${en ? category.en : category.label}: ${category.nodes.length}${en ? " words" : "語"}`, 23);
  }
  text(en ? "Dashed lines: explicit stated reasons (tentative). Star: explicitly stated most important value. Empty branches remain unconfirmed." : "破線：本人が語った理由の候補（未確定）。星：最重要と明示した軸。空の枝は未確認のままです。", 20);
  capture();
  return combineParticipantPdf(jpegPagesPdf(pages), release.pdf);
}
