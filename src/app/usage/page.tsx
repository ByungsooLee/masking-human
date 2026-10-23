import { AppShell } from "@/components/app-shell";
import { UsageDashboard } from "@/components/usage/usage-dashboard";
import { isDemoOnly } from "@/lib/demo-mode";

export default function UsagePage() {
  return (
    <AppShell>
      {isDemoOnly() ? <p className="p-6">デモでは有料API・利用料取得を無効にしています。 / Paid APIs and billing requests are disabled in this demo.</p> : <UsageDashboard />}
    </AppShell>
  );
}
