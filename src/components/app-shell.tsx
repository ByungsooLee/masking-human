import { PrimaryNavigation } from "@/components/primary-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        data-theme="magazine"
        className="theme-ground border-b border-[color:var(--color-line)] px-[var(--space-page-x)] py-3"
      >
        <div className="mx-auto max-w-[var(--content-max)]"><PrimaryNavigation /></div>
      </header>
      {children}
    </>
  );
}
