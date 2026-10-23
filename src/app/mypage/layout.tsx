import { Suspense, type ReactNode } from "react";
import { MyPageFrame } from "@/components/live/my-page-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-6">Loading…</p>}><MyPageFrame>{children}</MyPageFrame></Suspense>;
}
