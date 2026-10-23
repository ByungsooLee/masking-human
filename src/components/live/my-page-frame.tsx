"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MyPageDraftContext } from "@/contexts/my-page-draft-context";
import { PrimaryNavigation } from "@/components/primary-navigation";
import { SpendAlertBanner } from "@/components/usage/spend-alert-banner";
import { isDemoOnly } from "@/lib/demo-mode";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { bloomFontClassName } from "@/themes/bloom/fonts";

const sections = [
  { href: "/mypage", ja: "ホーム", en: "Home" },
  { href: "/mypage/history", ja: "履歴", en: "History" },
  { href: "/mypage/photo-consent", ja: "撮影許可", en: "Photos" },
  { href: "/mypage/usage", ja: "利用料", en: "Usage" },
];

export function MyPageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [dirty, setDirty] = useState(false);
  const en = useMagazineFlowStore((state) => state.prepare.language) === "en";
  return <div data-theme="bloom" className={`${bloomFontClassName} bloom-ground theme-body min-h-screen`}>
    <header className="border-b border-[color:var(--color-thread)] bg-white/80 px-[var(--space-page-x)] py-3">
      <div className="mx-auto flex max-w-[72rem] flex-wrap items-center justify-between gap-3">
        <PrimaryNavigation confirmLeave={dirty} />
      </div>
    </header>
    <div className="border-b border-[color:var(--color-thread)] px-[var(--space-page-x)]">
      <nav aria-label={en ? "My page sections" : "マイページのメニュー"} className="mx-auto grid max-w-[72rem] grid-cols-4 gap-1 py-2 sm:flex sm:gap-6">
        {sections.map((section) => {
          const active = pathname === section.href || (section.href !== "/mypage" && pathname.startsWith(`${section.href}/`));
          return <Link onNavigate={(event) => {
            if (dirty && !active && !window.confirm(en ? "Leave this page? The signature has not been saved yet." : "署名がまだ保存されていません。このページから移動しますか？")) event.preventDefault();
          }} key={section.href} href={section.href} aria-current={active ? "page" : undefined} className="justify-center rounded-xl px-2 py-2 text-center text-sm sm:px-3 text-[color:var(--color-ink-muted)] aria-[current=page]:bg-[color:var(--color-blush)] aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--color-rose)]">{en ? section.en : section.ja}</Link>;
        })}
      </nav>
    </div>
    {!isDemoOnly() && <SpendAlertBanner />}
    <MyPageDraftContext.Provider value={setDirty}>{children}</MyPageDraftContext.Provider>
  </div>;
}
