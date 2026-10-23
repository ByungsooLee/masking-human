import type { Utterance } from "@/lib/realtime/types";
import { buildSelfAnalysisMap } from "./self-analysis-map";

export function buildAnalysisFindings(transcript: readonly (Utterance & { excluded?: boolean })[], language: "ja" | "en" = "ja") {
  const map = buildSelfAnalysisMap(transcript);
  const en = language === "en";
  const values = map.nodes.filter((node) => node.category === "value").slice(0, 3);
  const future = map.nodes.filter((node) => node.category === "future").slice(0, 3);
  const relation = map.relations[0];
  const groups = [
    {
      id: "values", title: en ? "What you said matters" : "大切だと話したこと",
      finding: values.length ? (en ? `Words you used when talking about what matters: ${values.map((node) => `“${node.label}”`).join(", ")}.` : `大切さを語った発言から、「${values.map((node) => node.label).join("」「")}」という言葉が見つかりました。`) : (en ? "What matters most is still unconfirmed. It is okay not to have an answer yet." : "大切にしていることは、まだ確認できていません。答えが決まっていなくても大丈夫です。"),
      evidenceIds: [...new Set(values.flatMap((node) => node.evidenceIds))],
      question: en ? "Do these words describe what matters to you, or would you use different words?" : "この言葉は、あなたが大切にしていることに合っていますか？別の言い方のほうが近いですか？",
    },
    {
      id: "reasons", title: en ? "A reason behind your actions or feelings" : "行動や気持ちの理由",
      finding: relation ? (en ? `You connected “${map.nodes.find((node) => node.id === relation.source)!.label}” with “${map.nodes.find((node) => node.id === relation.target)!.label}” when explaining a reason.` : `理由を説明した発言で、「${map.nodes.find((node) => node.id === relation.source)!.label}」から「${map.nodes.find((node) => node.id === relation.target)!.label}」へのつながりを語っています。`) : (en ? "A clear reason is not yet confirmed. Words appearing together do not necessarily cause one another." : "はっきりした理由は、まだ確認できていません。同じ話に出てくるだけで、原因と結果には結びつけません。"),
      evidenceIds: relation?.evidenceIds ?? [],
      question: en ? "Is this connection accurate? What other reasons might be involved?" : "このつながりは合っていますか？ほかにも理由やきっかけはありそうですか？",
    },
    {
      id: "future", title: en ? "What you want to carry forward" : "これからの希望",
      finding: future.length ? (en ? `Words from statements about your future: ${future.map((node) => `“${node.label}”`).join(", ")}. They are starting points for reflection, not recommendations.` : `これからについて語った発言に、「${future.map((node) => node.label).join("」「")}」という言葉がありました。これは振り返りの手がかりで、行動を勧める結論ではありません。`) : (en ? "You have not yet clearly described a future direction. You do not need to decide now." : "これからどうしたいかは、まだ十分に語られていません。今すぐ決める必要はありません。"),
      evidenceIds: [...new Set(future.flatMap((node) => node.evidenceIds))],
      question: en ? "Does this still feel right? What would you like to keep or change?" : "今の気持ちにも合っていますか？続けたいこと、変えたいことは何でしょうか？",
    },
  ];
  return groups.map((group) => {
    const evidence = map.guests.filter((row) => group.evidenceIds.includes(row.id));
    return { ...group, evidence, available: evidence.length > 0, reviewKey: JSON.stringify([group.id, evidence.map((row) => [row.id, row.text])]) };
  });
}
