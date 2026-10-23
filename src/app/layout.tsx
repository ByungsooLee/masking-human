import type { Metadata } from "next";
import { InterfaceLanguageSync } from "@/components/interface-language-sync";
import { DemoNotice } from "@/components/demo-notice";
import { isDemoOnly } from "@/lib/demo-mode";
import "./globals.css";

export const metadata: Metadata = {
  title: "手入れの記憶",
  description: "Realtime interview about care and memory",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><InterfaceLanguageSync />{isDemoOnly() && <DemoNotice />}{children}</body>
    </html>
  );
}
