import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        data-theme="magazine"
        className="theme-ground border-b border-[color:var(--color-line)] px-[var(--space-page-x)] py-3"
      >
        <nav className="mx-auto flex max-w-[var(--content-max)] flex-wrap gap-4 text-sm">
          <Link href="/live" className="text-[color:var(--color-ink)]">
            Live
          </Link>
          <Link href="/usage" className="text-[color:var(--color-ink)]">
            Usage
          </Link>
          <Link href="/" className="text-[color:var(--color-ink-muted)]">
            Text
          </Link>
          <Link href="/voice" className="text-[color:var(--color-ink-muted)]">
            Voice
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
