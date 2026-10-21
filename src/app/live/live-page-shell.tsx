import { Suspense, type ReactNode } from "react";

export function LivePageShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-stage-letterbox,#141816)] text-[length:var(--text-body)] text-[color:var(--color-ink-muted,#9aa8a3)]">
          …
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
