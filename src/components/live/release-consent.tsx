"use client";

import { useEffect, useRef, useState } from "react";
import { RELEASE_VERSION, ReleaseSchema, exposureLabel, releaseTerms, releaseAcknowledgements, type Exposure, type ReleaseConfig, type ReleaseRecord, type SignedRelease } from "@/lib/consent/release";
import type { PhotoPermission } from "@/lib/consent/photo-permission";
import { createReceiptPdf, downloadReceipt } from "@/lib/consent/receipt-pdf";

export function ReleaseConsent({ language, value, onChange, onPublicationIntent, sessionId, photo }: { language: "ja" | "en"; value: SignedRelease | null; onChange: (release: SignedRelease | null) => void; onPublicationIntent?: () => void; sessionId?: string; photo?: PhotoPermission }) {
  const en = language === "en";
  const baseAcknowledgements = releaseAcknowledgements(language);
  const acknowledgements = photo ? { ...baseAcknowledgements,
    monetization: en ? "I understand only the selected artwork, publication and commercial uses are permitted; unselected uses need separate consent." : "選択した作品・掲載・商用利用のみを許可し、未選択の用途には別途同意が必要であることを確認します。",
    withdrawal: en ? "I have read the withdrawal and removal conditions, including limits for sold prints and reposts. My statutory rights are not waived." : "公開前後の撤回・削除の相談方法と、販売済み作品・転載の回収には限界があることを確認します。法令上の権利は放棄しません。",
  } : baseAcknowledgements;
  const label = (option: Exposure) => photo ? (option === "A" ? (en ? "Identifiable face / body OK" : "顔・全身の写真OK") : (en ? "Back / hands only — no face" : "後ろ姿・手元のみ（顔なし）")) : exposureLabel(option, en);
  const [config, setConfig] = useState<ReleaseConfig | null>(null);
  const [level, setLevel] = useState<Exposure | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<"adult" | "guardian">("adult");
  const [guardian, setGuardian] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [monetization, setMonetization] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [signed, setSigned] = useState(false);
  const [ink, setInk] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pending = useRef<SignedRelease | null>(null);
  useEffect(() => { let active = true; void fetch("/api/release-consent").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((data: ReleaseConfig) => { if (active) setConfig(data); }).catch(() => { if (active) setError(en ? "Could not load consent settings. Reload this page." : "同意設定を読み込めませんでした。再読み込みしてください。"); }); return () => { active = false; }; }, [en]);
  const reset = () => { canvas.current?.getContext("2d")?.clearRect(0, 0, 1000, 300); setSigned(false); setInk(false); };
  const invalidate = () => { setSigned(false); setAgreed(false); setMonetization(false); setWithdrawal(false); pending.current = null; };
  const submit = async () => {
    if (!config?.ready || !level || !signed || !agreed || !confirmed || !monetization || !withdrawal) return;
    setBusy(true); setError("");
    try {
      if (!pending.current) {
        const record: ReleaseRecord = ReleaseSchema.parse({ id: crypto.randomUUID(), videoId: sessionId ?? crypto.randomUUID(), purpose: photo ? "photography" : "interview", photo, version: RELEASE_VERSION, language, exposure: level, name: name.trim(), email: email.trim(), age, guardian: age === "guardian" ? guardian.trim() : "", agreed: true, ageConfirmed: true, monetizationConfirmed: true, withdrawalConfirmed: true, signedAt: new Date().toISOString(), terms: releaseTerms(level, language, config, photo), signature: canvas.current!.toDataURL("image/png") });
        const pdf = await createReceiptPdf(record);
        pending.current = { record, pdf, mail: "pending" };
      }
      const response = await fetch("/api/release-consent", { method: "POST", headers: { "Content-Type": "application/json", "x-consent-operator": token }, body: JSON.stringify(pending.current) });
      const result = await response.json();
      if (!response.ok || !result.saved) throw new Error(result.error ?? "FAILED");
      onChange({ ...pending.current!, mail: result.mail, providerId: result.providerId });
      pending.current = null; setToken("");
    } catch { setError(en ? "Could not confirm server save / email. Check the operator token, server settings and connection, then retry. The same receipt will be retried." : "サーバー保存・メール受付を確認できませんでした。運営者トークン・サーバー設定・接続を確認して再試行してください。同じ控えを再送します。"); }
    finally { setBusy(false); }
  };
  const retryMail = async () => {
    if (!value) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/release-consent", { method: "POST", headers: { "Content-Type": "application/json", "x-consent-operator": token }, body: JSON.stringify(value) });
      const result = await response.json();
      if (!response.ok || result.mail !== "accepted") throw new Error();
      onChange({ ...value, mail: "accepted", providerId: result.providerId }); setToken("");
    } catch { setError(en ? "Email not confirmed. Check configuration / token and retry." : "メール送信受付を確認できませんでした。設定・トークンを確認し再試行してください。"); }
    finally { setBusy(false); }
  };
  if (value) return <section className="border-t border-[color:var(--color-thread)] pt-6 space-y-4">
    <h2>{en ? "Thank you for taking part!" : "ご協力ありがとうございました！"}</h2>
    <p role="status">{value.mail === "accepted" ? (en ? "Your PDF receipt was accepted by the email service. Delivery may be delayed; check spam too." : "控えPDFのメール送信を受け付けました。到着まで時間がかかる場合があります。迷惑メールもご確認ください。") : (en ? "Consent saved. Email has NOT been sent. Download the PDF and retry after configuring email." : "同意を保存しました。メールは未送信です。PDFをお渡しし、メール設定後に再試行してください。")}</p>
    <p>{label(value.record.exposure)} / {value.record.signedAt}</p><p className="break-all">{en ? "Shoot ID: " : "撮影ID："}{value.record.videoId}</p>
    <details><summary>{en ? "Review signed terms" : "署名した同意内容を見る"}</summary><p className="whitespace-pre-wrap leading-loose">{value.record.terms}</p></details>
    <button type="button" className="ui-btn-sub min-h-12" onClick={() => downloadReceipt(value.pdf, value.record.id)}>{en ? "Save receipt PDF" : "控えPDFを保存"}</button>
    {value.mail === "pending" && <div className="space-y-3"><label className="block">{en ? "Operator token (operator only)" : "運営者トークン（運営者のみ入力）"}<input className="ui-field w-full" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} /></label><button type="button" className="ui-btn-sub min-h-12" disabled={busy || !token} onClick={() => void retryMail()}>{en ? "Retry email" : "メールを再送"}</button></div>}
    <p>{en ? "A changed scope requires a new signed agreement. The previous server record is retained; contact the organizer about revocation." : "範囲の変更には新しい署名が必要です。前のサーバー記録は残ります。撤回については主催者にご連絡ください。"}</p>
    <button type="button" className="ui-btn-sub min-h-12" disabled={busy} onClick={() => { onChange(null); reset(); setLevel(null); setAgreed(false); setConfirmed(false); }}>{en ? "Choose scope again" : "範囲を選び直す"}</button>
    {error && <p role="alert">{error}</p>}
  </section>;
  return <section className="border-t border-[color:var(--color-thread)] pt-6 space-y-5">
    <h2>{en ? "Choose what may be shared" : "掲載してよい範囲を選んでください"}</h2>
    <p>{en ? "Review the material and permitted uses, then choose a scope and sign. Recording consent is not publication permission. You may decline; without a saved signature the material must not be published." : "素材と利用範囲を確認し、掲載範囲を選んで署名してください。記録への同意と公開許可は別です。同意を断ることもできます。署名を保存しない素材は公開できません。"}</p>
    <div role="group" aria-label={en ? "Exposure level" : "露出レベル"} className="grid gap-3 sm:grid-cols-3">{(photo ? (["A", "C"] as const) : (["A", "B", "C"] as const)).map((option) => <button type="button" key={option} aria-pressed={level === option} disabled={busy} className="min-h-24 border rounded-xl p-4 text-left aria-pressed:border-[color:var(--color-rose)] aria-pressed:bg-[color:var(--color-surface)]" onClick={() => { setLevel(option); onPublicationIntent?.(); invalidate(); reset(); }}><strong>{option}: {label(option)}</strong><span className="block mt-2">{photo ? (en ? "Still photographs only; no interview audio or video" : "静止画のみ・インタビュー音声や動画は対象外") : option === "A" ? (en ? "Face, voice and full body" : "顔・声・全身") : option === "B" ? (en ? "Operator must cut / obscure visuals" : "映像は主催者がカット・加工") : (en ? "Face cut; voice permitted / may be processed" : "顔カット・音声使用OK（必要に応じて加工）")}</span></button>)}</div>
    {!config?.ready && <p role="status">{en ? "Operator setup is incomplete. You can preview the form, but consent cannot be saved until organizer, contact, retention, storage and operator token are configured." : "運営者設定が未完了です。フォームは確認できますが、主催者・連絡先・保存期間・保存先・運営者トークンがそろうまで、同意を保存できません。"}</p>}
    {level && config && <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <p>{en ? "No automatic face masking or audio processing is performed. The operator must edit and check before publication." : "顔の自動モザイク・音声の自動加工は行いません。公開前の編集・確認は主催者が行います。"}</p>
      <div className="max-h-80 overflow-y-auto whitespace-pre-wrap leading-loose border-y py-4" tabIndex={0} aria-label={en ? "Consent terms" : "同意約款"}>{releaseTerms(level, language, { organizer: config.organizer || (en ? "Not configured" : "未設定"), contact: config.contact || (en ? "Not configured" : "未設定"), retention: config.retention || (en ? "Not configured — cannot sign yet" : "未設定・同意保存不可") }, photo)}</div>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">{en ? "Full Name" : "本人氏名"}<input className="ui-field w-full" required maxLength={100} autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); invalidate(); }} /></label>
        <label className="block">{en ? "Email" : "連絡先メールアドレス（控えの送付先）"}<input className="ui-field w-full" required maxLength={254} type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); invalidate(); }} /></label>
        <label className="block">{en ? "Age confirmation" : "年齢確認"}<select className="ui-field w-full" value={age} onChange={(event) => { setAge(event.target.value as "adult" | "guardian"); setConfirmed(false); invalidate(); reset(); }}><option value="adult">{en ? "18 or older" : "18歳以上"}</option><option value="guardian">{en ? "Under 18 — guardian signs" : "18歳未満・保護者が署名"}</option></select></label>
        {age === "guardian" && <label className="block">{en ? "Parent / legal guardian name (guardian must sign below)" : "保護者氏名（以下は保護者本人が署名）"}<input className="ui-field w-full" required maxLength={100} value={guardian} onChange={(event) => { setGuardian(event.target.value); invalidate(); }} /></label>}
        <label className="flex gap-3 items-center min-h-12"><input type="checkbox" required checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); invalidate(); }} />{acknowledgements.age}</label>
        <label className="flex gap-3 items-center min-h-12"><input type="checkbox" required checked={agreed} onChange={(event) => { setAgreed(event.target.checked); pending.current = null; }} />{en ? "I read and agree to the selected uses, scope and terms." : "選択した用途・掲載範囲と約款を読み、同意します。"}</label>
        <label className="flex gap-3 items-center min-h-12"><input type="checkbox" required checked={monetization} onChange={(event) => { setMonetization(event.target.checked); pending.current = null; }} />{acknowledgements.monetization}</label>
        <label className="flex gap-3 items-center min-h-12"><input type="checkbox" required checked={withdrawal} onChange={(event) => { setWithdrawal(event.target.checked); pending.current = null; }} />{acknowledgements.withdrawal}</label>
        <p>{age === "guardian" ? (en ? "Guardian signature" : "保護者の署名") : (en ? "Your handwritten signature" : "手書き署名")}</p>
        <canvas ref={canvas} width={1000} height={300} aria-label={en ? "Draw your signature here" : "指またはペンで署名してください"} className="w-full h-40 border rounded-lg bg-white touch-none" style={{ pointerEvents: signed ? "none" : "auto" }} onPointerDown={(event) => { const target = event.currentTarget; target.setPointerCapture(event.pointerId); drawing.current = true; const box = target.getBoundingClientRect(); const context = target.getContext("2d")!; context.beginPath(); context.moveTo((event.clientX - box.left) * 1000 / box.width, (event.clientY - box.top) * 300 / box.height); }} onPointerMove={(event) => { if (!drawing.current) return; const target = event.currentTarget; const box = target.getBoundingClientRect(); const context = target.getContext("2d")!; context.strokeStyle = "#2A2A28"; context.lineWidth = 4; context.lineCap = "round"; context.lineTo((event.clientX - box.left) * 1000 / box.width, (event.clientY - box.top) * 300 / box.height); context.stroke(); setInk(true); }} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
        <div className="flex gap-3"><button className="ui-btn-sub min-h-12" type="button" onClick={() => { reset(); pending.current = null; }}>{en ? "Clear signature" : "署名をリセット"}</button><button className="ui-btn-sub min-h-12" type="button" disabled={!ink || signed} onClick={() => setSigned(true)}>{signed ? (en ? "Signature confirmed" : "署名確定済み") : (en ? "Confirm signature" : "署名を確定")}</button></div>
        <label className="block">{en ? "Operator token (operator only; not saved)" : "運営者トークン（運営者のみ入力・保存しません）"}<input className="ui-field w-full" type="password" required autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} /></label>
      </fieldset>
      {!config.mailReady && <p>{en ? "Email is not configured. Consent can be saved and PDF downloaded, but no email will be sent." : "メール未設定です。同意保存とPDFダウンロードはできますが、メールは送信されません。"}</p>}
      {signed && <p role="status">{en ? "Signature input confirmed; consent is not saved yet. Complete the required fields and checks, ask the operator to enter their token, then press Save consent & send receipt below. Email delivery is separate from consent saving." : "署名の入力を確定しました。同意はまだ保存されていません。必須項目・チェックを確認し、運営者がトークンを入力した後、下の「同意を保存・控えを送信」を押してください。メールの送信と同意の保存は別です。"}</p>}
      <button type="submit" className="ui-btn min-h-12" disabled={!config.ready || busy || !signed || !agreed || !confirmed || !monetization || !withdrawal || !token}>{busy ? (en ? "Saving…" : "保存しています…") : (en ? "Save consent & send receipt" : "同意を保存・控えを送信")}</button>
    </form>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
