"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryNavigation } from "@/components/primary-navigation";
import { PhotoSignaturePad } from "./photo-signature-pad";
import { SIMPLE_PHOTO_USES, PhotoPermissionSchema, photoRetentionLabel, type PhotoPermission } from "@/lib/consent/photo-permission";
import { listPhotoPermissions, savePhotoPermission } from "@/lib/consent/photo-archive";
import { createReceiptPdf, downloadReceipt } from "@/lib/consent/receipt-pdf";
import { RELEASE_VERSION, ReleaseSchema, releaseTerms, type ReleaseConfig, type SignedRelease } from "@/lib/consent/release";
import { bloomFontClassName } from "@/themes/bloom/fonts";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function PhotoConsentPage() {
  const language = useMagazineFlowStore((state) => state.prepare.language);
  const en = language === "en";
  const setPrepare = useMagazineFlowStore((state) => state.setPrepare);
  const persistPrepare = useMagazineFlowStore((state) => state.persistPrepare);
  const [config, setConfig] = useState<ReleaseConfig | null>(null);
  const [shoot, setShoot] = useState({ date: "", location: "", project: "", period: "", compensation: "" });
  const [shootId, setShootId] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"A" | "C" | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [generation, setGeneration] = useState(0);
  const [release, setRelease] = useState<SignedRelease | null>(null);
  const [rows, setRows] = useState<SignedRelease[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<SignedRelease | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/release-consent").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((settings: ReleaseConfig) => {
      if (!active) return;
      const date = new Date();
      setConfig(settings);
      setShoot((current) => ({ ...current, date: current.date || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }));
      setShootId(crypto.randomUUID());
    }).catch(() => { if (active) setError("Could not load settings / 設定を読み込めませんでした"); });
    void listPhotoPermissions().then(setRows).catch(() => setError("Browser history unavailable / ブラウザ履歴を開けません"));
    return () => { active = false; };
  }, []);
  const period = shoot.period || (en ? "One year from the shoot date" : "撮影日から1年間");
  const compensation = shoot.compensation || (en ? "Unpaid (no fee)" : "無償（謝礼なし）");
  const photoInput = { ...shoot, format: "simple-v1" as const, project: shoot.project || (en ? "Photography artwork" : "写真作品"), period, compensation, files: shootId, uses: [...SIMPLE_PHOTO_USES], credit: "anonymous" as const, displayName: "", captureConfirmed: true as const };
  const photoResult = PhotoPermissionSchema.safeParse(photoInput);
  const photo: PhotoPermission | null = photoResult.success ? photoResult.data : null;
  const settingsReady = Boolean(config?.ready && photo && token.trim());
  const invalidate = () => { pending.current = null; setSignature(""); setAgreed(false); setGeneration((value) => value + 1); };
  const changeLanguage = (locale: "ja" | "en") => { if (locale === language) return; setPrepare({ language: locale }); persistPrepare(); setError(""); if (!release) invalidate(); };
  const submit = async () => {
    if (!config?.ready || !photo || !scope || !agreed || !signature || !token || busy) return;
    setBusy(true); setError("");
    try {
      if (!pending.current) {
        const record = ReleaseSchema.parse({ id: crypto.randomUUID(), videoId: shootId, purpose: "photography", photo, version: RELEASE_VERSION, language, exposure: scope, name: name.trim(), email: email.trim(), age: "adult", guardian: "", agreed: true, ageConfirmed: true, monetizationConfirmed: true, withdrawalConfirmed: true, signedAt: new Date().toISOString(), terms: releaseTerms(scope, language, config, photo), signature });
        pending.current = { record, pdf: await createReceiptPdf(record), mail: "pending" };
      }
      const response = await fetch("/api/release-consent", { method: "POST", headers: { "Content-Type": "application/json", "x-consent-operator": token }, body: JSON.stringify(pending.current) });
      const result = await response.json();
      if (!response.ok || !result.saved) throw new Error();
      const saved: SignedRelease = { ...pending.current!, mail: result.mail, providerId: result.providerId };
      setRelease(saved); pending.current = null;
      try { await savePhotoPermission(saved); setRows(await listPhotoPermissions()); }
      catch { setError(en ? "Saved on the server, but browser history failed. Keep the PDF and shoot ID." : "サーバーへ保存しましたがブラウザ履歴に保存できません。PDFと撮影番号を保管してください。"); }
    } catch { setError(en ? "Could not confirm saving. Check the operator setup and connection, then retry. The same receipt is retried." : "保存を確認できませんでした。運営者設定・接続を確認して再試行してください。同じ控えを再試行します。"); }
    finally { setBusy(false); }
  };
  const nextGuest = () => { setRelease(null); setName(""); setEmail(""); setScope(null); setShootId(crypto.randomUUID()); setError(""); invalidate(); };
  return <div data-theme="bloom" className={`${bloomFontClassName} bloom-ground theme-body min-h-screen`}>
    <header className="px-[var(--space-page-x)] py-3"><PrimaryNavigation confirmLeave={!release && Boolean(signature)} /></header>
    <main className="mx-auto max-w-2xl space-y-6 px-[var(--space-page-x)] py-8">
      <div role="group" aria-label="表示言語 / Display language" className="flex gap-3">{(["ja", "en"] as const).map((locale) => <button type="button" key={locale} lang={locale} aria-pressed={language === locale} disabled={busy} className="ui-btn-sub min-h-12 min-w-24 aria-pressed:underline" onClick={() => changeLanguage(locale)}>{locale === "ja" ? "日本語" : "English"}</button>)}</div>
      <h1 className="ui-heading">{en ? "Thank you for being part of my photography" : "写真撮影へのご協力ありがとうございます"}</h1>
      <p>{config?.organizer || "Byungsoo Lee"} / {shoot.date}</p>
      {!release && <details className="border-b pb-4"><summary>{en ? "Operator setup" : "運営者設定"}</summary><div className="mt-4 space-y-3"><p>{en ? "Set before handing the screen to the participant. Defaults: one-year artwork use, unpaid. Confirm these conditions for this shoot. This adult-only form is not a worldwide legal guarantee." : "相手に渡す前に設定してください。作品利用は1年間・無償が初期値です。今回の条件として確認・変更してください。成人用の簡易フォームで、海外での有効性を一律に保証するものではありません。"}</p>
        {([["location", en ? "Shoot location (required)" : "撮影場所（必須）", "text"], ["date", en ? "Shoot date" : "撮影日", "date"], ["project", en ? "Project (optional)" : "作品名（任意）", "text"], ["period", en ? "Artwork use period" : "作品の利用期間", "text"], ["compensation", en ? "Compensation" : "謝礼", "text"]] as const).map(([key, label, type]) => <label className="block" key={key}>{label}<input className="ui-field w-full min-h-12" type={type} disabled={busy} maxLength={key === "project" ? 120 : 180} value={key === "period" ? period : key === "compensation" ? compensation : shoot[key]} onChange={(event) => { setShoot((current) => ({ ...current, [key]: event.target.value })); invalidate(); }} /></label>)}
        <label className="block">{en ? "Operator token (private; kept in memory only)" : "運営者トークン（非公開・メモリ上のみ）"}<input type="password" autoComplete="off" disabled={busy} className="ui-field w-full min-h-12" value={token} onChange={(event) => setToken(event.target.value)} /></label>
        <p className="break-all">{en ? "Shoot ID: " : "撮影番号："}{shootId}</p></div></details>}
      {!release ? <>
        <section className="space-y-3 leading-loose">
          <p>{en ? "May I photograph you during this session and use the photos together as my artwork on social media, my website / portfolio, in exhibitions, photo books and artwork print sales?" : "今回撮影する写真一式を、私の写真作品としてSNS・Webサイト・展示・写真集・作品プリント販売に使用してもよろしいですか？"}</p>
          <p>{en ? "I may crop and adjust brightness / color. Online photos can be viewed worldwide. No corporate ads, third-party stock licensing, AI training or face swaps. No public name or account tags." : "トリミングや明るさ・色の調整等を行う場合があります。ネットでは世界から閲覧できます。企業広告・第三者への素材販売・AI学習・顔の合成には使いません。本名やアカウントのタグ付けもしません。"}</p>
          <p>{en ? "Use period: " : "作品の利用期間："}{period}<br />{en ? "Compensation: " : "謝礼："}{compensation}</p>
        </section>
        {!settingsReady && <p role="status">{en ? "Before signing, the operator must complete the shoot location, private token and server setup above." : "署名前に、運営者が上の設定から撮影場所・トークン・サーバー設定を確認してください。"}</p>}
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block">{en ? "Your name" : "お名前"}<input required maxLength={100} autoComplete="name" className="ui-field w-full min-h-12" value={name} onChange={(event) => { setName(event.target.value); pending.current = null; }} /></label>
            <fieldset><legend className="mb-2">{en ? "What may be shown?" : "掲載してよい範囲"}</legend><div className="grid gap-3 sm:grid-cols-2">{(["A", "C"] as const).map((option) => <label key={option} className="flex min-h-16 items-center gap-3 rounded-xl border p-3"><input type="radio" name="photo-scope" required checked={scope === option} onChange={() => { setScope(option); invalidate(); }} />{option === "A" ? (en ? "Face / full body OK" : "顔出しOK") : (en ? "Only if I cannot be identified" : "顔などから特定できない写真のみ")}</label>)}</div></fieldset>
            <label className="flex min-h-12 items-center gap-3"><input type="checkbox" required checked={agreed} onChange={(event) => { setAgreed(event.target.checked); pending.current = null; }} />{en ? "I am 18 or older and agree to the photography and artwork uses described here." : "18歳以上で、このページに記載された撮影・作品利用に同意します。"}</label>
            <PhotoSignaturePad key={`${language}-${generation}`} en={en} disabled={busy} onChange={(value) => { setSignature(value); pending.current = null; }} />
            <label className="block">{en ? "Email — optional, only for a receipt" : "メール（任意・控えをご希望の方のみ）"}<input type="email" maxLength={254} autoComplete="email" className="ui-field w-full min-h-12" value={email} onChange={(event) => { setEmail(event.target.value); pending.current = null; }} /></label>
          </fieldset>
          <p className="text-sm leading-loose">{en ? "Participation is optional. Contact me before or after publication to withdraw consent or request removal. Sold prints or reposts may not be recoverable. Your legal rights remain. Under 18? Please ask the operator to arrange guardian permission; do not sign this adult form." : "参加は任意です。公開前後の撤回・削除は下の連絡先へご相談ください。販売済み作品や転載は回収できない場合があります。法令上の権利は制限しません。18歳未満の方はここに署名せず、運営者へ保護者対応をご相談ください。"}</p>
          <button type="submit" className="ui-btn min-h-12 w-full" disabled={!settingsReady || !name.trim() || !scope || !agreed || !signature || busy}>{busy ? (en ? "Saving…" : "保存しています…") : (en ? "Agree & save" : "同意して保存")}</button>
        </form>
        <p className="text-sm leading-loose">{en ? "Name, signature, optional email and shoot details are stored in the operator browser and private server only for consent records and receipt delivery. Retention: " : "氏名・署名・任意のメール・撮影情報は、同意記録と控えのため運営者のブラウザ・専用サーバーに保存します。保存期間："}{photoRetentionLabel(config?.retention || (en ? "Not configured" : "未設定"), en)}<br />{en ? "Contact / privacy requests: " : "お問い合わせ・個人情報のご相談："}{config?.contact || (en ? "Not configured" : "未設定")}</p>
        <details className="border-t pt-4"><summary>{en ? "Full agreement & shoot details" : "同意内容・撮影情報の詳細"}</summary><p className="whitespace-pre-wrap py-4 text-sm leading-loose">{config && photo ? releaseTerms(scope ?? "A", language, config, photo) : (en ? "Complete operator setup to preview the full agreement." : "運営者設定が完了すると同意書全文を確認できます。")}</p></details>
      </> : <section className="space-y-4">
        <h2 className="ui-heading">{en ? "Thank you!" : "ありがとうございます！"}</h2><p role="status">{en ? "Your permission has been saved for this shoot's photos together. Nothing has been published." : "今回の撮影写真一式への同意を保存しました。まだ公開はしていません。"}</p>
        <p>{release.mail === "accepted" ? (en ? "Receipt email accepted for sending; delivery is not confirmed." : "控えメールは送信受付済みです。到達確認ではありません。") : !release.record.email ? (en ? "No receipt email requested. You can save the PDF below." : "メール送信は希望されていません。下からPDFを保存できます。") : (en ? "Email has not been sent. Save the PDF; ask the operator to check email setup." : "メールは未送信です。PDFを保存し、運営者が送信設定を確認してください。")}</p>
        <p className="break-all">{release.record.videoId}</p><p>{en ? "Saved agreements remain in their original signed language." : "保存済みの同意書は署名時の原文を保持します。"}</p>
        <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadReceipt(release.pdf, release.record.id)}>{en ? "Save private receipt PDF" : "控えPDFを保存（非公開）"}</button>
        <button type="button" className="ui-btn min-h-12" onClick={nextGuest}>{en ? "Next participant" : "次の方へ"}</button>
      </section>}
      {error && <p role="alert">{error}</p>}
      <details className="border-t pt-4"><summary>{en ? "Operator: saved photo permissions" : "運営者用：写真同意の履歴"}</summary>{rows.map((row) => <div className="space-y-2 border-b py-3" key={row.record.id}><p>{row.record.photo?.date} / {row.record.name}</p><p className="break-all">{row.record.videoId}</p><button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadReceipt(row.pdf, row.record.id)}>{en ? "Save private PDF" : "非公開のPDFを保存"}</button></div>)}</details>
    </main>
  </div>;
}
