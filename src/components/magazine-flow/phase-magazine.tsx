"use client";

import { useEffect, useState } from "react";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";
import type { ExportAspect, MagazineDraft } from "@/lib/magazine-flow/types";
import { validateMagazineDraft } from "@/lib/magazine-flow/validate-guest-text";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { MagazinePageView } from "@/themes/magazine/magazine-page-view";

export function PhaseMagazine() {
  const ui = getMagazineFlowUi();
  const draft = useMagazineFlowStore((s) => s.draft);
  const setDraft = useMagazineFlowStore((s) => s.setDraft);
  const transcript = useMagazineFlowStore((s) => s.transcript);
  const prepare = useMagazineFlowStore((s) => s.prepare);
  const photoUrl = useMagazineFlowStore((s) => s.photoUrl);
  const exportAspect = useMagazineFlowStore((s) => s.exportAspect);
  const setExportAspect = useMagazineFlowStore((s) => s.setExportAspect);
  const setPhase = useMagazineFlowStore((s) => s.setPhase);
  const [local, setLocal] = useState<MagazineDraft | null>(draft);
  const [reveal, setReveal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(draft);
    setReveal(true);
    const t = setTimeout(() => setReveal(false), 900);
    return () => clearTimeout(t);
  }, [draft]);

  if (!local) {
    return (
      <p className="px-[var(--space-page-x)] py-[var(--space-page-y)] text-[length:var(--text-body)]">
        {ui.validationFailed}
      </p>
    );
  }

  const aspects: { id: ExportAspect; label: string }[] = [
    { id: "4:5", label: ui.aspect45 },
    { id: "9:16", label: ui.aspect916 },
    { id: "16:9", label: ui.aspect169 },
  ];

  const previewWidth =
    exportAspect === "16:9" ? "max-w-[min(100%,960px)]" : exportAspect === "9:16" ? "max-w-[min(100%,420px)]" : "max-w-[min(100%,560px)]";

  const saveAndContinue = () => {
    if (!validateMagazineDraft(local, transcript)) {
      setError(ui.validationFailed);
      return;
    }
    setDraft(local);
    setPhase("publish");
  };

  return (
    <div className="mx-auto grid max-w-[72rem] gap-[var(--space-block)] px-[var(--space-page-x)] py-[var(--space-page-y)] lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-[length:var(--text-body)]" role="group" aria-label={ui.magazineHeading}>
          {aspects.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setExportAspect(a.id)}
              aria-pressed={exportAspect === a.id}
              className="ui-btn-sub ui-num"
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className={`ui-panel w-full ${previewWidth} p-3`}>
          <MagazinePageView draft={local} prepare={prepare} photoUrl={photoUrl} exportAspect={exportAspect} reveal={reveal} />
        </div>
      </div>

      <div className="flex flex-col gap-4 text-[length:var(--text-body)]">
        <h1 className="ui-heading">{ui.magazineHeading}</h1>
        <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
          {ui.titleLabel}
          <input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} className="ui-field" />
        </label>
        <label className="flex flex-col gap-1 text-[color:var(--color-ink-muted)]">
          {ui.leadLabel}
          <textarea
            value={local.lead}
            rows={4}
            onChange={(e) => setLocal({ ...local, lead: e.target.value })}
            className="ui-field"
          />
        </label>
        {error && <p className="text-[color:var(--color-rose)]">{error}</p>}
        <button type="button" onClick={saveAndContinue} className="ui-btn mt-2">
          {ui.toPublish}
        </button>
      </div>
    </div>
  );
}
