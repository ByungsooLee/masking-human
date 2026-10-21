import { LivePageClient } from "./live-page-client";
import { LivePageShell } from "./live-page-shell";

export default function LivePage() {
  return (
    <LivePageShell>
      <LivePageClient />
    </LivePageShell>
  );
}
