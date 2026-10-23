import { Suspense } from "react";
import { PhotoConsentPage } from "@/components/live/photo-consent-page";

export default function Page() {
  return <Suspense fallback={<p role="status">Loading…</p>}><PhotoConsentPage embedded /></Suspense>;
}
