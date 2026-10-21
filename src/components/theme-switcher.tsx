"use client";

import type { LiveUiCopy } from "@/lib/i18n/live-ui";
import type { ThemeId } from "@/themes/types";

const STORAGE_KEY = "liveTheme";

type Props = {
  copy: LiveUiCopy;
  themeId: ThemeId;
  onChange: (id: ThemeId) => void;
};

const OPTIONS: { id: ThemeId; label: (c: LiveUiCopy) => string }[] = [
  { id: "magazine", label: (c) => c.themeMagazine },
  { id: "cinema", label: (c) => c.themeCinema },
  { id: "cosme", label: (c) => c.themeCosme },
];

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "magazine";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "cinema" || v === "cosme" || v === "magazine") return v;
  return "magazine";
}

export function storeTheme(id: ThemeId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function ThemeSwitcher({ copy, themeId, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={themeId === opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-sm border px-3 py-1 ${
            themeId === opt.id
              ? "border-[color:var(--color-ink)] text-[color:var(--color-ink)]"
              : "border-[color:var(--color-line)] text-[color:var(--color-ink-muted)]"
          }`}
        >
          {opt.label(copy)}
        </button>
      ))}
    </div>
  );
}
