"use client";

import { useSearchParams } from "next/navigation";
import { MagazineFlow } from "@/components/magazine-flow/magazine-flow";

export function LivePageClient() {
  const searchParams = useSearchParams();
  const mockOnly = searchParams.get("mock") === "1";

  return <MagazineFlow mockOnly={mockOnly} />;
}
