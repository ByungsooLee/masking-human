"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiTranslator } from "@/hooks/use-ui-translator";

const destinations = [
  { href: "/live", label: "インタビュー" },
  { href: "/live/archive", label: "履歴" },
  { href: "/photo-consent", label: "写真撮影許可" },
  { href: "/usage", label: "利用料" },
];

export function PrimaryNavigation({ confirmLeave = false }: { confirmLeave?: boolean }) {
  const t = useUiTranslator();
  const pathname = usePathname();
  return <nav aria-label={t("メインメニュー")} className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
    {destinations.map(({ href, label }) => <Link key={href} href={href}
      aria-current={pathname === href ? "page" : undefined}
      className="rounded-sm py-1 text-[color:var(--color-ink)] aria-[current=page]:font-medium aria-[current=page]:underline aria-[current=page]:underline-offset-8"
      onNavigate={(event) => {
        if (confirmLeave && pathname !== href && !window.confirm(t("別のページに移動すると、未保存の録音・編集内容は失われます。移動しますか？"))) event.preventDefault();
      }}>
      {t(label)}
    </Link>)}
  </nav>;
}
