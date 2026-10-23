import { UsageDashboard } from "@/components/usage/usage-dashboard";
import { isDemoOnly } from "@/lib/demo-mode";

export default function UsagePage() {
  return (
    <>
      {isDemoOnly() ? <p className="p-6">デモでは有料API・利用料取得を無効にしています。 / Paid APIs and billing requests are disabled in this demo.</p> : <UsageDashboard />}
    </>
  );
}
