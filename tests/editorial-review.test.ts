import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildClipCandidates, buildEditorialReviewExport, reviewConversation } from "@/lib/archive/editorial-review";
import type { TranscriptEntry } from "@/lib/magazine-flow/types";
import cases from "../eval/interviewer-recovery-cases.json";

vi.mock("server-only", () => ({}));
import { buildRealtimeClientSecretSession } from "@/lib/realtime/session-payload.server";

const entry = (id: string, speaker: TranscriptEntry["speaker"], text: string, excluded = false): TranscriptEntry => ({ id, speaker, text, excluded, startedAt: 1000, endedAt: 2000 });

describe("local editorial review and recovery contracts", () => {
  it.each(["default", "reflective"] as const)("sends recovery and recording/publication separation to %s", (agentId) => {
    const { instructions } = buildRealtimeClientSecretSession({ agentId });
    for (const rule of ["次の一問の判断", "短答や「特にない」が2回", "相づちであり", "足した解釈を撤回", "次の一問で焦点や話題を変える", "本人が使っていない抽象的な人物評", "収録と公開動画を混同しない", "公開用の冒頭・切り抜き・見出しは収録後", "1回につき質問は1つだけ"]) expect(instructions).toContain(rule);
    expect(instructions).toContain("心理診断や治療をする役割ではありません");
  });
  it.each(cases.cases)("finds a review marker in the synthetic $id failure, without pretending to evaluate generated speech", (scenario) => {
    const bad = reviewConversation([entry("guest", "guest", scenario.guest), entry("ai", "ai", scenario.badReply)]);
    expect(bad.turnsToReview[0].checks).toContain(scenario.expectedBadMarker);
    const preferred = reviewConversation([entry("guest", "guest", scenario.guest), entry("ai", "ai", scenario.preferredReply)]);
    expect(preferred.turnsToReview).toEqual([]);
    expect(cases.provenance).toContain("not generated model results");
  });
  it("keeps exact quotes, negations and neighboring context with approximate time ranges", () => {
    const transcript = [entry("question", "ai", "どんな変化がありましたか？"), entry("answer", "guest", "昔は緊張しましたが、今は無理をしないようにしています。"), entry("follow", "ai", "どんな場面でそう感じますか？")];
    const [clip] = buildClipCandidates(transcript);
    expect(clip.quote).toBe(transcript[1].text);
    expect(clip.context.map((row) => row.id)).toEqual(["question", "answer", "follow"]);
    expect(clip).toMatchObject({ startMs: 1000, endMs: 2000, publicationApproved: false, needsPrivacyReview: true });
  });
  it("does not bridge excluded context, leak corrections or classify AI words as guest highlights", () => {
    const exportData = buildEditorialReviewExport("session", [
      entry("hidden", "ai", "PRIVATE-QUESTION", true),
      { ...entry("guest", "guest", "昨日、初めて自分の意見を伝えてみました。"), originalText: "PRIVATE-ORIGINAL" },
      entry("hidden-answer", "guest", "PRIVATE-EXCLUDED 昔は今は選ぶ", true),
      entry("ai", "ai", "Yesterday I chose something new."),
    ]);
    expect(exportData.candidates).toHaveLength(1);
    expect(exportData.candidates[0].context).toHaveLength(1);
    expect(exportData.candidates[0].contextMayBeIncomplete).toBe(true);
    expect(JSON.stringify(exportData)).not.toContain("PRIVATE-");
    expect(exportData.isViralPrediction).toBe(false);
  });
  it("does not invent highlights or valid timing for insufficient legacy data", () => {
    expect(buildClipCandidates([entry("plain", "guest", "特に何もありません。")])).toEqual([]);
    const [clip] = buildClipCandidates([{ ...entry("timing", "guest", "I used to go walking every evening."), startedAt: Number.NaN }]);
    expect(clip.startMs).toBeNull(); expect(clip.endMs).toBeNull();
    expect(buildEditorialReviewExport("empty", []).review.aiTurnCount).toBe(0);
  });
  it("limits candidates in chronological input order without a virality score", () => {
    const clips = buildClipCandidates(Array.from({ length: 9 }, (_, index) => entry(`guest-${index}`, "guest", `昨日、初めて試したことをお話しします ${index}`)));
    expect(clips).toHaveLength(5); expect(clips[0].id).toBe("guest-0"); expect(clips[4].id).toBe("guest-4");
    expect(clips[0]).not.toHaveProperty("score");
  });
  it("flags exact repetition and shows recovery context without judging the guest", () => {
    const result = reviewConversation([entry("ai1", "ai", "そうなのかなと思いました。"), entry("guest", "guest", "つまらないです。"), entry("ai2", "ai", "そうなのかなと思いました。")]);
    expect(result.turnsToReview[1].checks).toContain("repeated_reply");
    expect(result.recoveryToReview[0].nextAi?.id).toBe("ai2");
    expect(result).not.toHaveProperty("qualityScore");
  });
  it("does not mistake a generic thank-you during recovery for an interview closing", () => {
    const result = reviewConversation([entry("ai", "ai", "率直に言ってくださってありがとうございます。別の話題からでもお話しできます。")]);
    expect(result.turnsToReview[0].checks).toContain("no_question_marker");
    expect(reviewConversation([entry("closing", "ai", "今日はありがとうございました。")]).turnsToReview).toEqual([]);
  });
  it("keeps editing review in archive exports and out of participant screens", () => {
    expect(readFileSync("src/components/live/history-editing-downloads.tsx", "utf8")).toContain("<HistoryEditorialReview");
    expect(readFileSync("src/lib/recording/editing-files.ts", "utf8")).toContain('"editorial-review.json"');
    for (const phase of ["prepare", "conversation", "results"]) expect(readFileSync(`src/components/magazine-flow/phase-${phase}.tsx`, "utf8")).not.toContain("HistoryEditorialReview");
  });
});
