import { Suspense } from "react";
import { ArchiveSessionDetail } from "@/components/live/archive-session-detail";

type Props = { params: Promise<{ id: string }> };

async function ArchiveDetailContent({ params }: Props) {
  const { id } = await params;
  return <ArchiveSessionDetail id={id} embedded />;
}

export default function ArchiveDetailPage({ params }: Props) {
  return <Suspense fallback={<div className="px-6 py-8" role="status">Loading…</div>}>
    <ArchiveDetailContent params={params} />
  </Suspense>;
}
