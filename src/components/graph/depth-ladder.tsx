"use client";

import type { Depth } from "@/lib/graph/lexicon";
import { useMagazineFlowUi } from "@/hooks/use-magazine-flow-ui";

/** How far down the laddering the conversation has gone: what they do, why, and the memory behind it. */
export function DepthLadder({ reached }: { reached: Depth | -1 }) {
  const ui = useMagazineFlowUi();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[color:var(--color-ink-muted)]">{ui.depthHeading}</span>
      <ol className="ui-ladder" aria-label={ui.depthHeading}>
        {ui.depthRings.map((label, i) => (
          <li key={label} data-reached={i <= reached} aria-current={i === reached ? "step" : undefined}>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
