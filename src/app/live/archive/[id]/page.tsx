import { Suspense } from "react";
import { redirect } from "next/navigation";

async function LegacyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return redirect(`/mypage/history/${encodeURIComponent(id)}`);
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status">Loading…</p>}><LegacyDetail {...props} /></Suspense>;
}
