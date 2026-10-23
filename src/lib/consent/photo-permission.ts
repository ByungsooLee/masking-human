import { z } from "zod";

export const PHOTO_USES = ["sns", "portfolio", "exhibition", "book", "printSales", "advertising"] as const;
export const SIMPLE_PHOTO_USES = ["sns", "portfolio", "exhibition", "book", "printSales"] as const;
export function photoRetentionLabel(value: string, en: boolean): string {
  return en && value === "撮影日から1年間" ? "One year from the shoot date" : value;
}
export const PhotoPermissionSchema = z.object({
  format: z.literal("simple-v1").optional(),
  project: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value),
  location: z.string().trim().min(1).max(180),
  files: z.string().trim().min(1).max(500),
  uses: z.array(z.enum(PHOTO_USES)).min(1).refine((values) => new Set(values).size === values.length),
  period: z.string().trim().min(1).max(180),
  compensation: z.string().trim().min(1).max(200),
  credit: z.enum(["anonymous", "named"]), displayName: z.string().trim().max(100),
  captureConfirmed: z.literal(true),
}).refine((photo) => photo.credit !== "named" || Boolean(photo.displayName))
  .refine((photo) => photo.format !== "simple-v1" || (photo.credit === "anonymous" && photo.uses.length === SIMPLE_PHOTO_USES.length && SIMPLE_PHOTO_USES.every((use) => photo.uses.includes(use))));
export type PhotoPermission = z.infer<typeof PhotoPermissionSchema>;

export function photoUseLabel(use: typeof PHOTO_USES[number], en: boolean): string {
  return en ? { sns: "Instagram / social media", portfolio: "Website / portfolio", exhibition: "Art exhibitions", book: "Photo books / publications", printSales: "Sale of artwork prints", advertising: "Paid advertising / brand PR" }[use]
    : { sns: "Instagram等のSNS", portfolio: "Webサイト・ポートフォリオ", exhibition: "作品展示・展覧会", book: "写真集・出版物", printSales: "作品プリントの販売", advertising: "広告・ブランドPR" }[use];
}

export function photoPermissionTerms(photo: PhotoPermission, level: "A" | "B" | "C", en: boolean, config: { organizer: string; contact: string; retention: string }) {
  if (photo.format === "simple-v1") return simplePhotoTerms(photo, level, en, config);
  return (en ? [
    `Photography permission — Photographer: ${config.organizer}; Contact: ${config.contact}.`,
    `Project: ${photo.project}. Shoot date: ${photo.date}. Location: ${photo.location}. Covered photographs / shoot reference: ${photo.files}.`,
    "I permit the described photography. This agreement is separate from AI interviews and does not permit interview audio or video use.",
    level === "A" ? "Identifiable face / full-body photographs are permitted." : "Back / hands only, with face and identifying visual features excluded. The photographer must check and crop manually; no automatic anonymization is provided.",
    `Permitted uses ONLY: ${photo.uses.map((use) => photoUseLabel(use, true)).join(", ")}. Use period: ${photo.period}. Public online use may be viewed worldwide. No additional media, ads, sales or sublicensing without separate consent.`,
    `Compensation / payment: ${photo.compensation}. Credit: ${photo.credit === "anonymous" ? "Anonymous; do not publish my name or tag my account" : photo.displayName}.`,
    "I permit selection, cropping, exposure / color adjustment and retouching consistent with the described artwork, not degrading or misleading edits. AI training, face swapping, sensitive-context use and unrelated advertising are excluded. Approval does not transfer the subject's rights wholesale or clear other people's, artworks' or locations' rights.",
    "I am 18+ or my parent / legal guardian has reviewed and signs this agreement. Participation is voluntary. Before publication, contact the photographer to discuss withdrawal. After publication, removal may be limited by sold prints and third-party reposts; statutory rights and remedies for unlawful or out-of-scope use remain. No blanket waiver of privacy or portrait rights.",
    `Name, email, signature and shoot ID are used only for consent evidence, receipt delivery and inquiries; stored in the operator browser and private server. Resend processes receipt emails when configured. Consent-record retention: ${config.retention}; independent of the agreed artwork use period. Contact ${config.contact} about correction, access or deletion.`,
    "Handwritten record only, not verified identity or a certified electronic signature. Legal review is required for your location and intended use.",
  ] : [
    `写真撮影・作品利用同意書。撮影者：${config.organizer}。お問い合わせ：${config.contact}。`,
    `作品・案件名：${photo.project}。撮影日：${photo.date}。場所：${photo.location}。対象写真・撮影番号：${photo.files}。`,
    "上記の写真撮影を許可します。AIインタビューとは別の同意であり、インタビューの音声・動画利用を許可するものではありません。",
    level === "A" ? "顔・全身など本人が識別できる写真の利用を許可します。" : "顔や識別できる特徴を含まない後ろ姿・手元のみを許可します。撮影者が画角・カットを確認します。自動匿名化は行いません。",
    `許可する利用は次の項目のみ：${photo.uses.map((use) => photoUseLabel(use, false)).join("、")}。作品の利用期間：${photo.period}。インターネット公開は海外からも閲覧可能です。未選択の媒体・広告・販売・第三者への再許諾は別途同意が必要です。`,
    `謝礼・対価・支払条件：${photo.compensation}。氏名表記：${photo.credit === "anonymous" ? "匿名・氏名やアカウントのタグ付けなし" : photo.displayName}。`,
    "説明した作品の趣旨に沿う選定・トリミング・明るさや色の調整・レタッチを許可します。尊厳を損なう編集、誤解を招く文脈、AI学習・顔の合成・センシティブな用途・無関係の広告は含みません。本人の権利の全面譲渡や、他の被写体・著作物・施設の権利処理を代替する同意ではありません。",
    "18歳以上、または親権者・保護者が内容を確認して署名します。参加は任意です。公開前の撤回は撮影者へご相談ください。公開後もご相談を受け付けますが、販売済み作品や第三者の転載は回収・削除できない場合があります。法令上の権利、違法・同意範囲外利用への請求を制限せず、肖像権・プライバシー権を全面放棄するものではありません。",
    `氏名・メール・署名・撮影IDは同意証拠・控え送信・相談対応のみに利用し、運営者のブラウザと専用サーバーへ保存します。メール送信時はResendが処理します。同意記録の保存期間：${config.retention}。作品の利用期間とは別です。開示・訂正・削除の相談先：${config.contact}。`,
    "本人確認・認証付き電子署名ではありません。撮影地や利用形態に応じて専門家の確認を受けてください。",
  ]).join("\n\n");
}

export function simplePhotoTerms(photo: PhotoPermission, level: "A" | "B" | "C", en: boolean, config: { organizer: string; contact: string; retention: string }): string {
  const retention = photoRetentionLabel(config.retention, en);
  return (en ? [
    `I permit ${config.organizer} to photograph me during this session and use the photographs together as artwork on social media, a website / portfolio, in exhibitions, photo books and artwork print sales. This does not include interview audio or video.`,
    level === "A" ? "Face / full-body photographs are OK." : "Only photographs in which I cannot be identified are permitted. The photographer must check and crop; this is not automatic.",
    `Use period: ${photo.period}. Compensation: ${photo.compensation}. Online photographs may be viewed worldwide. Cropping, brightness / color adjustments and appropriate retouching are permitted, not misleading or degrading edits.`,
    "No corporate advertising, third-party stock licensing, AI training or face swaps under this permission. My legal name and account will not be published or tagged.",
    `Participation is voluntary. Contact ${config.contact} to withdraw consent or request removal, before or after publication. Sold prints and third-party reposts may not be fully recoverable. Statutory rights remain; this is not an irrevocable blanket waiver.`,
    `Name, signature, optional email and shoot details are stored in the operator's browser and private server for consent evidence and receipt delivery. Record retention: ${retention}. Contact ${config.contact} for privacy requests. Resend processes receipt email only if an address is provided and email is configured.`,
    "I am 18 or older and agree to the photography and artwork uses above. Handwritten record only, not certified identity verification. This form does not clear other people's, artworks' or locations' rights.",
    `Session: ${photo.files}. Date: ${photo.date}. Location: ${photo.location}. Project: ${photo.project}.`,
  ] : [
    `今回の撮影で${config.organizer}が私を撮影し、写真一式を写真作品としてSNS・Webサイト／ポートフォリオ・展示・写真集・作品プリント販売に使用することを許可します。インタビューの音声・動画は含みません。`,
    level === "A" ? "顔・全身が写る写真の掲載OKです。" : "私が特定できない写真のみ許可します。撮影者が画角・カットを確認し、自動加工はしません。",
    `作品の利用期間：${photo.period}。謝礼：${photo.compensation}。インターネットでは世界から閲覧できます。トリミング・明るさ・色調整等の適切な編集を許可し、誤解を招く編集や尊厳を損なう編集は含みません。`,
    "企業広告・第三者への素材販売・AI学習・顔の合成は、この同意だけでは使用しません。本名の公開やアカウントのタグ付けはしません。",
    `参加は任意です。公開前後の同意撤回・削除のご相談は${config.contact}へ。販売済み作品や第三者の転載は回収できない場合があります。法令上の権利を制限するものではなく、撤回不可の全面的な権利放棄ではありません。`,
    `氏名・署名・任意のメール・撮影情報は、同意証拠と控えのため運営者のブラウザ・専用サーバーで保存します。同意記録の保存期間：${config.retention}。個人情報のご相談先：${config.contact}。メールは入力があり送信設定済みの場合のみResendで控え送信に利用します。`,
    "私は18歳以上で、上記の撮影・作品利用に同意します。認証付き本人確認ではなく、手書きの同意記録です。他人の肖像・著作物・施設の権利処理を代替しません。",
    `撮影番号：${photo.files}。撮影日：${photo.date}。場所：${photo.location}。作品：${photo.project}。`,
  ]).join("\n\n");
}
