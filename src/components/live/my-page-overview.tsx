"use client";

import { useEffect, useState } from "react";
import { prepareNewInterview } from "@/lib/archive/prepare-new-interview";
import Link from "next/link";
import { archivedMediaBytes, listArchivedSessions } from "@/lib/archive/session-archive";
import { listPhotoPermissions } from "@/lib/consent/photo-archive";
import { formatStorageBytes } from "@/components/live/archive-storage-status";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

export function MyPageOverview() {
  const en = useMagazineFlowStore((state) => state.prepare.language) === "en";
  const [history, setHistory] = useState<{ count: number; unsigned: number; bytes: number } | null>(null);
  const [photos, setPhotos] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([listArchivedSessions(), listPhotoPermissions()]).then(([interviews, permissions]) => {
      if (cancelled) return;
      setFailed(interviews.status === "rejected" || permissions.status === "rejected");
      if (interviews.status === "fulfilled") setHistory({ count: interviews.value.length, unsigned: interviews.value.filter((row) => !row.releaseConsent).length, bytes: interviews.value.reduce((total, row) => total + archivedMediaBytes(row), 0) });
      if (permissions.status === "fulfilled") setPhotos(permissions.value.length);
    });
    return () => { cancelled = true; };
  }, [attempt]);
  return <main className="mx-auto max-w-[72rem] px-[var(--space-page-x)] py-[var(--space-page-y)]">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-xl space-y-3">
        <h1 className="ui-heading">{en ? "My page" : "マイページ"}</h1>
        <p className="leading-loose text-[color:var(--color-ink-muted)]">{en ? "Keep your recordings, permissions and usage in one place. Start here before and after each interview." : "収録したもの、撮影の許可、利用料をひとつの場所に。インタビュー前後の作業を、ここから進められます。"}</p>
      </div>
      <Link onNavigate={prepareNewInterview} href="/live" className="ui-btn inline-flex items-center">{en ? "Prepare an interview" : "インタビューの準備へ"}</Link>
    </div>
    {failed && <div role="status" className="mb-6 space-y-3"><p>{en ? "Some saved data could not be loaded. Check this browser's storage settings and retry." : "保存データの一部を読み込めませんでした。ブラウザの保存設定を確認して再試行してください。"}</p><button type="button" className="ui-btn-sub" onClick={() => setAttempt((value) => value + 1)}>{en ? "Retry" : "再読み込み"}</button></div>}
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="rounded-[var(--radius-soft)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="space-y-3">
          <h2 className="text-[length:var(--text-body)] font-semibold">{en ? "Interview history" : "インタビュー履歴"}</h2>
          <p className="max-w-md leading-loose text-[color:var(--color-ink-muted)]">{en ? "Resume a review, check publication consent or download recordings and editing materials." : "途中の確認を再開したり、掲載同意を確かめたり。録音や編集素材も、ここから保存できます。"}</p>
        </div>
        <dl className="my-7 flex flex-wrap gap-x-10 gap-y-5 border-y border-[color:var(--color-thread)] py-5">
          <div><dt className="text-sm text-[color:var(--color-ink-muted)]">{en ? "Saved interviews" : "保存した履歴"}</dt><dd className="mt-2 text-[length:var(--text-body)] font-semibold">{history ? (en ? `${history.count}` : `${history.count}件`) : "—"}</dd></div>
          <div><dt className="text-sm text-[color:var(--color-ink-muted)]">{en ? "Without a signature" : "掲載署名なし"}</dt><dd className="mt-2 text-[length:var(--text-body)] font-semibold">{history ? (en ? `${history.unsigned}` : `${history.unsigned}件`) : "—"}</dd></div>
          <div><dt className="text-sm text-[color:var(--color-ink-muted)]">{en ? "Recorded media" : "録音・映像"}</dt><dd className="mt-2 text-[length:var(--text-body)] font-semibold">{history ? formatStorageBytes(history.bytes) : "—"}</dd></div>
        </dl>
        <Link href="/mypage/history" className="ui-btn inline-flex items-center">{en ? "Open interview history" : "履歴を開く"}</Link>
        <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-ink-muted)]">{en ? "Saved on this device and browser. Unsigned material must not be published." : "履歴はこの端末・ブラウザ内に保存されます。掲載署名のない素材は公開できません。"}</p>
      </section>
      <div className="divide-y divide-[color:var(--color-thread)]">
        <section className="pb-7 pt-2">
          <h2 className="text-[length:var(--text-body)] font-semibold">{en ? "Photo permission" : "写真撮影許可"}</h2>
          <p className="my-3 max-w-md leading-loose text-[color:var(--color-ink-muted)]">{en ? "Collect permission before a photo shoot and check saved receipts." : "写真撮影の前に許可を取り、保存した同意書の控えを確認します。"}</p>
          <p className="mb-4 text-sm">{en ? `Saved permissions: ${photos ?? "—"}` : `保存した許可 ${photos == null ? "—" : `${photos}件`}`}</p>
          <Link href="/mypage/photo-consent" className="ui-btn-sub inline-flex items-center">{en ? "Manage photo permissions" : "撮影許可を管理する"}</Link>
        </section>
        <section className="py-7">
          <h2 className="text-[length:var(--text-body)] font-semibold">{en ? "Usage" : "利用料"}</h2>
          <p className="my-3 max-w-md leading-loose text-[color:var(--color-ink-muted)]">{en ? "Check monthly spending and interview estimates away from the participant screen." : "今月の利用状況や収録ごとの推定額を、参加者画面と分けて確認できます。"}</p>
          <Link href="/mypage/usage" className="ui-btn-sub inline-flex items-center">{en ? "View usage" : "利用料を確認する"}</Link>
        </section>
      </div>
    </div>
  </main>;
}
