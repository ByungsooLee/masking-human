import { z } from "zod";
import { PhotoPermissionSchema, photoPermissionTerms, type PhotoPermission } from "./photo-permission";

export const RELEASE_VERSION = "2026-10-22.2";
export type Exposure = "A" | "B" | "C";
export type ReleaseConfig = { organizer: string; contact: string; retention: string; ready: boolean; mailReady: boolean };
export const ReleaseSchema = z.object({
  id: z.string().uuid(), videoId: z.string().uuid(), version: z.literal(RELEASE_VERSION),
  language: z.enum(["ja", "en"]), exposure: z.enum(["A", "B", "C"]),
  name: z.string().trim().min(1).max(100), email: z.union([z.literal(""), z.string().email().max(254)]),
  age: z.enum(["adult", "guardian"]), guardian: z.string().trim().max(100),
  agreed: z.literal(true), ageConfirmed: z.literal(true), monetizationConfirmed: z.literal(true), withdrawalConfirmed: z.literal(true),
  signedAt: z.string().datetime(), terms: z.string().max(12000),
  signature: z.string().max(200000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
  purpose: z.enum(["interview", "photography"]).optional(), photo: PhotoPermissionSchema.optional(),
}).refine((record) => record.age !== "guardian" || record.guardian.length > 0)
  .refine((record) => record.purpose === "photography" ? Boolean(record.photo) && record.exposure !== "B" : !record.photo && Boolean(record.email))
  .refine((record) => record.photo?.format !== "simple-v1" || record.age === "adult");
export type ReleaseRecord = z.infer<typeof ReleaseSchema>;
export type SignedRelease = { record: ReleaseRecord; pdf: string; mail: "pending" | "accepted"; providerId?: string };

export function releaseAcknowledgements(language: "ja" | "en") {
  return language === "en" ? {
    age: "I confirm I am 18+ or have parental consent.",
    monetization: "I agree to monetization, PR and commercial use of the video within my selected scope.",
    withdrawal: "I agree that withdrawal of consent and video deletion requests after publication are generally not accepted merely due to a change of mind. To the extent permitted by law, I will not assert portrait or privacy claims against use within the agreed scope. This does not waive statutory rights, remedies for unlawful or out-of-scope use, or liability that cannot lawfully be excluded.",
  } : {
    age: "18歳以上（成人）、または親権者の同意を得ていることを誓約します。",
    monetization: "選択した掲載範囲内で、動画が広告収益化、PR・商業利用されることに同意します。",
    withdrawal: "公開後、単なる心変わりによる同意撤回・動画削除請求には原則応じられないことに同意します。同意した利用範囲内かつ法令で認められる限り、肖像権・プライバシー権に基づく権利主張を行いません。ただし、法令上の権利、違法・同意範囲外の利用への請求、法令上免除できない責任は除外します。",
  };
}

export function exposureLabel(level: Exposure, en: boolean) {
  return en ? { A: "Full appearance", B: "Voice only", C: "Back / hands only — face cut; voice OK / may be processed" }[level]
    : { A: "フル顔出しOK", B: "声のみOK", C: "後ろ姿・手元のみ（顔カット・音声使用OK／加工処理）" }[level];
}

export function releaseTerms(level: Exposure, language: "ja" | "en", config: Pick<ReleaseConfig, "organizer" | "contact" | "retention">, photo?: PhotoPermission) {
  if (photo) return photoPermissionTerms(photo, level, language === "en", config);
  const en = language === "en";
  const acknowledgements = releaseAcknowledgements(language);
  const scope = en ? {
    A: "I permit publication of my face, voice and full-body appearance.",
    B: "I permit publication of my voice only. No identifiable image of me may be published; the operator must cut or obscure identifying visuals before publication. This app does not automatically blur faces.",
    C: "I permit back / hands views only, with my face cut out and other identifying visual details excluded. My voice may be used, with audio processing where needed. The operator must check framing and edit before publication; this app does not automatically cut faces or process voices. Voice use does not guarantee anonymity.",
  }[level] : {
    A: "顔・声・全身の映像の掲載を許可します。",
    B: "声のみの掲載を許可します。本人を識別できる映像は掲載せず、主催者が公開前にカット・モザイク等で除去します。このアプリに顔の自動モザイク機能はありません。",
    C: "映像は顔や本人を識別できる特徴を含まない後ろ姿・手元のみとし、顔はカットします。音声の使用を許可し、必要に応じて音声を加工します。主催者が画角と編集を確認します。このアプリに顔の自動カット・音声の自動加工機能はありません。音声から本人が分かる可能性は残ります。",
  }[level];
  return (en ? [
    `Organizer: ${config.organizer}. Contact: ${config.contact}.`, scope,
    acknowledgements.age, acknowledgements.monetization, acknowledgements.withdrawal,
    "Within the selected scope, I permit recording and publication on YouTube, Instagram and other social media, including monetized content and advertising use.",
    "I permit cuts, captions and sound effects within that scope, without misleading distortion of my words or dignity. My name, email and signature are not for public display.",
    "I am 18 or older, or my parent / legal guardian has reviewed this agreement and signs below as guardian. Participation is voluntary; I may decline or stop the interview.",
    "After publication, withdrawal is generally not accepted merely due to a change of mind. This does not waive statutory rights or remedies for unlawful use or use outside the agreed scope. Contact the organizer to discuss concerns before or after publication; third-party reposts may not be fully removable.",
    `Name, email, signature and recording ID are used for consent records, receipt delivery and inquiries. Storage: operator's browser and server; email / attachment processed by Resend when sent. Retention: ${config.retention}. No marketing email. Contact the organizer for access, correction or deletion requests.`,
    "This is a handwritten consent record, not identity verification or a certified electronic signature. Legal review is required before production use.",
  ] : [
    `主催者：${config.organizer}。お問い合わせ：${config.contact}。`, scope,
    acknowledgements.age, acknowledgements.monetization, acknowledgements.withdrawal,
    "選択した範囲内で、録音・録画およびYouTube、Instagram等のSNSへの掲載、収益化・広告利用を許可します。",
    "選択範囲内でカット・テロップ・効果音による編集を許可します。発言の趣旨や尊厳を損なう編集は含みません。氏名・メール・署名は公開用ではありません。",
    "18歳以上、または保護者が内容を確認し保護者として署名します。参加は任意で、同意しないことや途中で会話を止めることができます。",
    "公開後、単なる心変わりによる撤回は原則としてお受けしません。ただし法令上の権利、違法な利用や同意範囲外の利用への救済を制限しません。公開前後の相談は主催者へご連絡ください。第三者による転載は完全に削除できない場合があります。",
    `氏名・メール・署名・撮影IDは同意記録、控え送信、お問い合わせ対応に利用します。運営者のブラウザとサーバーに保存し、メール送信時はResendが宛先と添付ファイルを処理します。保存期間：${config.retention}。広告メールには利用しません。開示・訂正・削除のご相談は主催者へご連絡ください。`,
    "手書きの同意記録であり、本人確認や認証付き電子署名ではありません。本番利用前に法律専門家による確認が必要です。",
  ]).join("\n\n");
}
