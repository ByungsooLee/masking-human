"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ExportAspect, MagazineDraft, PrepareState } from "@/lib/magazine-flow/types";
import { pickMagazineLayout } from "@/lib/magazine-flow/types";
import { MagazineLayoutBody } from "@/themes/magazine/layouts/magazine-layout-body";

type Props = {
  draft: MagazineDraft;
  prepare: Pick<PrepareState, "guestName" | "place">;
  photoUrl: string | null;
  exportAspect: ExportAspect;
  reveal: boolean;
  exportRootId?: string;
  layoutOverride?: ReturnType<typeof pickMagazineLayout>;
};

export function aspectRatioCss(aspect: ExportAspect): string {
  return aspect === "4:5" ? "4 / 5" : aspect === "9:16" ? "9 / 16" : "16 / 9";
}

export function MagazinePageView({
  draft,
  prepare,
  exportAspect,
  reveal,
  exportRootId = "magazine-export-root",
  layoutOverride,
}: Props) {
  const reduceMotion = useReducedMotion();
  const date = new Date().toISOString().slice(0, 10);
  const layout = layoutOverride ?? draft.layout ?? pickMagazineLayout(draft, exportAspect);

  const body = (
    <div
      id={exportRootId}
      data-theme="magazine"
      data-aspect={exportAspect}
      data-edition={draft.edition ?? "porcelain"}
      className="mag-page flex w-full flex-col overflow-hidden"
      style={{ aspectRatio: aspectRatioCss(exportAspect) }}
    >
      <MagazineLayoutBody draft={draft} prepare={prepare} layout={layout} exportAspect={exportAspect} date={date} />
    </div>
  );

  if (reveal && !reduceMotion) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.85 }}>
        {body}
      </motion.div>
    );
  }
  return body;
}
