"use client";

import { useEffect, useState } from "react";

export function formatStorageBytes(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function ArchiveStorageStatus({ count, mediaBytes, en }: { count: number; mediaBytes: number; en: boolean }) {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [message, setMessage] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void navigator.storage?.estimate?.().then((value) => { if (!cancelled) setEstimate(value); }).catch(() => undefined);
    void navigator.storage?.persisted?.().then((value) => { if (!cancelled) setPersistent(value); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [count, mediaBytes]);
  const protect = async () => {
    try { setPersistent(await navigator.storage.persist()); }
    catch { setPersistent(false); }
    setMessage(true);
  };
  return <section className="my-6 space-y-2 border-y py-4" aria-label={en ? "Browser storage" : "ブラウザの保存容量"}>
    <p>{en ? `${count} interviews · ${formatStorageBytes(mediaBytes)} of recorded media` : `履歴 ${count}件・録音／映像 ${formatStorageBytes(mediaBytes)}`}</p>
    {estimate?.quota != null && estimate.usage != null && <p>{en ? "Approximate space available to this site: " : "このサイトで利用できる空き容量の目安："}{formatStorageBytes(Math.max(0, estimate.quota - estimate.usage))}</p>}
    <p>{en ? "Stored on this device and browser, without cloud storage fees. Downloads do not delete history. Keep a separate backup before deleting entries." : "この端末・ブラウザに保存し、クラウド保存料はかかりません。ダウンロードしても履歴は消えません。削除前に別の場所へバックアップしてください。"}</p>
    {persistent === true ? <p>{en ? "Automatic storage eviction protection granted. Manual deletion and device loss are not covered." : "ブラウザによる自動整理からの保護が許可されています。手動削除や端末紛失には備えが必要です。"}</p> : <>
      {persistent !== null && typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function" && <button type="button" className="ui-btn-sub" onClick={() => void protect()}>{en ? "Request storage protection" : "保存領域の保護をリクエスト"}</button>}
      {message && persistent === false && <p role="status">{en ? "Protection was not granted. Interviews can still be saved; keep backups." : "保護は許可されませんでした。履歴の保存はできますが、バックアップを残してください。"}</p>}
    </>}
  </section>;
}
