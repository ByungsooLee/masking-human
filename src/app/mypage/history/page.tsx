import { Suspense } from "react";
import { InterviewHistory } from "@/components/live/interview-history";

export default function Page() {
  return <Suspense fallback={<p role="status">Loading…</p>}><InterviewHistory embedded /></Suspense>;
}
