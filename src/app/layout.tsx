import type { Metadata } from "next";
import { SpendAlertBanner } from "@/components/usage/spend-alert-banner";
import { InterfaceLanguageSync } from "@/components/interface-language-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "手入れの記憶",
  description: "Realtime interview about care and memory",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><InterfaceLanguageSync /><SpendAlertBanner />{children}</body>
    </html>
  );
}
