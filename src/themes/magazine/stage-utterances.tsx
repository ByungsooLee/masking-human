"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Utterance } from "@/lib/realtime/types";
import { formatEnglishQuote } from "@/lib/live/typography-en";
import { latestGuestUtterance, visibleStageUtterances } from "@/lib/live/stage-utterances";
import { resolveLiveUiLocale } from "@/lib/i18n/live-ui";

function displayText(u: Utterance): string {
  const loc = resolveLiveUiLocale();
  if (loc === "en" && u.speaker === "guest") return formatEnglishQuote(u.text);
  return u.text;
}

export function MagazineStageUtterances({ utterances }: { utterances: Utterance[] }) {
  const visible = visibleStageUtterances(utterances);
  const latestGuest = latestGuestUtterance(utterances);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-[var(--space-stage-text)]" style={{ lineBreak: "strict" }}>
      {visible.map((u) => {
        const isGuest = u.speaker === "guest";
        const isLatestGuest = latestGuest?.id === u.id;
        const text = displayText(u);

        if (isLatestGuest && isGuest) {
          const body = (
            <p
              className="max-w-[35ch] text-[length:var(--text-stage-quote)] leading-[var(--leading-body)] text-[color:var(--color-accent,var(--color-ink))]"
              style={{ fontFamily: "var(--font-stage-serif)", fontFeatureSettings: '"palt"' }}
            >
              {text}
            </p>
          );
          if (reduceMotion) return <div key={u.id}>{body}</div>;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55 }}
            >
              {body}
            </motion.div>
          );
        }

        return (
          <p
            key={u.id}
            className={`max-w-[35ch] text-[length:var(--text-stage-body)] leading-[var(--leading-body)] ${
              isGuest
                ? "text-[color:var(--color-ink)]"
                : "text-[color:var(--color-ink-muted)]"
            }`}
            style={{ fontFamily: isGuest ? "var(--font-stage-serif)" : "var(--font-stage-sans)" }}
          >
            {text}
          </p>
        );
      })}
    </div>
  );
}
