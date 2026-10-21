import { AppShell } from "@/components/app-shell";
import { InterviewChat } from "@/components/interview-chat";

export default function Home() {
  return (
    <AppShell>
      <div
        data-theme="magazine"
        className="theme-ground theme-body min-h-screen px-[var(--space-page-x)] py-[var(--space-page-y)]"
      >
        <div className="mx-auto max-w-[var(--content-max)]">
          <InterviewChat />
        </div>
      </div>
    </AppShell>
  );
}
