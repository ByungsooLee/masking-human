import type { Depth } from "@/lib/graph/lexicon";
import { getMagazineFlowUi } from "@/lib/i18n/magazine-flow-ui";

/** How far down the laddering the conversation has gone: what they do, why, and the memory behind it. */
export function DepthLadder({ reached }: { reached: Depth | -1 }) {
  const ui = getMagazineFlowUi();
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
