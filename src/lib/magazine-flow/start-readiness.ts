import type { PrepareState } from "./types";

export function interviewStartBlockers(prepare: PrepareState): string[] {
  const en = prepare.language === "en";
  const blockers: string[] = [];
  if (!prepare.place.trim()) blockers.push(en ? "Enter the recording location above." : "画面上部の撮影場所を入力してください。");
  if (!prepare.consents.aiConversation) blockers.push(en ? "Agree to the AI conversation (first checkbox)." : "AIとの会話に同意してください（1つ目のチェック）。");
  if (!prepare.consents.recording) blockers.push(en ? "Agree to recording (second checkbox)." : "録音・録画の保存に同意してください（2つ目のチェック）。");
  if (!prepare.consents.snsPublish) blockers.push(en ? "Confirm the publication plan and final signature step (third checkbox)." : "掲載予定と会話後の最終署名について確認してください（3つ目のチェック）。");
  return blockers;
}
