import { AppShell } from "@/components/app-shell";
import { VoiceInterview } from "@/components/voice-interview";

export default function VoicePage() {
  return (
    <AppShell>
      <div
        data-theme="magazine"
        className="theme-ground theme-body min-h-screen px-[var(--space-page-x)] py-[var(--space-page-y)]"
      >
        <VoiceInterview />
      </div>
    </AppShell>
  );
}
