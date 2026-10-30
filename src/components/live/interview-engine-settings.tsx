"use client";

import { useEffect, useState } from "react";
import { pipelineError } from "@/lib/pipeline/copy";
import type { PipelineCost } from "@/lib/pipeline/types";
import { PipelineCostPanel } from "@/components/usage/pipeline-cost-panel";

export function OperatorAccessStatus({ state, en }: { state: "checking" | "signed-out" | "signing-in" | "signed-in"; en: boolean }) {
  const labels = en
    ? { checking: "Checking login…", "signed-out": "Not signed in", "signing-in": "Signing in…", "signed-in": "✓ Signed in" }
    : { checking: "ログイン状態を確認中…", "signed-out": "未ログイン", "signing-in": "ログイン確認中…", "signed-in": "✓ ログイン済み" };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${state === "signed-in" ? "border-[#B2C8BA] bg-[#eef5ef] text-[#31503c]" : "border-[color:var(--color-thread)] text-[color:var(--color-ink-muted)]"}`}>{labels[state]}</span>;
}

export function InterviewEngineSettings({ value, en, mockOnly, onChange }: { value?: "pipeline" | "realtime"; en: boolean; mockOnly: boolean; onChange: (value: "pipeline" | "realtime") => void }) {
  const [password, setPassword] = useState("");
  const [cost, setCost] = useState<PipelineCost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(!mockOnly);
  useEffect(() => {
    if (mockOnly) return;
    let active = true;
    void fetch("/api/pipeline", { cache: "no-store", signal: AbortSignal.timeout(8000) }).then(async (response) => {
      if (response.ok && active) { const data = await response.json(); if (active) { setCost(data.cost); setAuthorized(true); } }
    }).catch(() => undefined).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [mockOnly]);
  const login = async () => {
    if (busy || checking || !password) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/pipeline/operator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? "PIPELINE_BAD_PASSWORD" : data.error);
      const summary = await fetch("/api/pipeline", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (summary.status === 401) throw new Error("PIPELINE_COOKIE");
      setPassword(""); setAuthorized(true);
      if (!summary.ok) throw new Error("PIPELINE_STORAGE");
      setCost((await summary.json()).cost);
    } catch (failure) { setError(pipelineError(failure instanceof Error && failure.message.startsWith("PIPELINE_") ? failure.message : "PIPELINE_LOGIN_NETWORK", en)); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/pipeline/operator", { method: "DELETE", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("PIPELINE_LOGIN_NETWORK");
      setAuthorized(false); setCost(null); setPassword("");
    } catch { setError(pipelineError("PIPELINE_LOGIN_NETWORK", en)); }
    finally { setBusy(false); }
  };
  return <details className="recording-exclude border-y border-[color:var(--color-thread)] py-4">
    <summary className="min-h-12 cursor-pointer"><span className="mr-3">{en ? "Interview engine / operator access" : "会話方式・運営者ログイン"}</span>{!mockOnly && <OperatorAccessStatus state={authorized ? "signed-in" : busy ? "signing-in" : checking ? "checking" : "signed-out"} en={en} />}</summary>
    <div className="space-y-4 py-4">
      <label className="flex flex-col gap-2">{en ? "Voice interview engine" : "音声会話の方式"}
        <select className="ui-field min-h-12" disabled={mockOnly} value={value ?? "realtime"} onChange={(event) => onChange(event.target.value as "pipeline" | "realtime")}>
          <option value="realtime">{en ? "OpenAI Realtime · existing" : "OpenAI Realtime・従来方式"}</option>
          <option value="pipeline">{en ? "Low-cost cloud · OpenRouter (comparison)" : "低コストクラウド・OpenRouter（比較用）"}</option>
        </select>
      </label>
      {value === "pipeline" && <p>{en ? "Speech recognition, replies and voice use OpenRouter and its providers. Preflight checks the key spending limit, not the account balance. Insufficient account credit may still reject requests. Operator sign-in is required." : "文字起こし・返答・読み上げをOpenRouterと接続先の事業者で処理します。開始前に確認するのはキーの利用上限で、アカウント残高ではありません。残高不足で処理が拒否される場合があります。運営者ログインが必要です。"}</p>}
      {!mockOnly && !authorized && <form className="flex flex-col gap-3" aria-busy={busy || checking} onSubmit={(event) => { event.preventDefault(); void login(); }}>
        <label>{en ? "Operator password" : "運営者パスワード"}<input className="ui-field mt-2 w-full" type="password" autoComplete="current-password" value={password} disabled={busy} onChange={(event) => { setPassword(event.target.value); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? "operator-login-error" : undefined} /></label>
        <button className="ui-btn min-h-12 self-start" type="submit" disabled={busy || checking || !password}>{busy ? (en ? "Verifying login…" : "ログインを確認しています…") : checking ? (en ? "Checking…" : "状態を確認中…") : (en ? "Operator sign in" : "運営者ログイン")}</button>
      </form>}
      {authorized && <div role="status" aria-live="polite" className="rounded-lg border border-[#B2C8BA] bg-[#eef5ef] px-4 py-4 text-[#31503c]">
        <p className="font-semibold">{en ? "✓ Login successful" : "✓ ログインできました"}</p>
        <p className="mt-1 text-sm">{en ? "You can use this device for up to 8 hours. Complete the interview settings and consent below, then press Start." : "この端末で最大8時間利用できます。下の設定・同意事項を確認し、開始ボタンへ進んでください。"}</p>
        <button type="button" className="ui-btn-sub mt-3 min-h-12" disabled={busy} onClick={() => void logout()}>{en ? "Sign out on this device" : "この端末からログアウト"}</button>
      </div>}
      {error && <p id="operator-login-error" role="alert" className="rounded-lg border border-[color:var(--color-rose)] bg-[#f6e9ed] px-4 py-3 text-[#823d55]">{error}</p>}
      {cost && <PipelineCostPanel cost={cost} en={en} />}
    </div>
  </details>;
}
