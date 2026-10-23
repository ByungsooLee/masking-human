"use client";

import { useSearchParams } from "next/navigation";
import { MagazineFlow } from "@/components/magazine-flow/magazine-flow";
import { isDemoOnly } from "@/lib/demo-mode";

export function LivePageClient() {
  const searchParams = useSearchParams();
  const mockOnly = isDemoOnly() || searchParams.get("mock") === "1";

  return <MagazineFlow mockOnly={mockOnly} />;
}
