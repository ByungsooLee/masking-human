"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Utterance } from "@/lib/realtime/types";

type Props = {
  utterance: Utterance;
  isClimax: boolean;
};

export function CosmeUtteranceBlock({ utterance, isClimax }: Props) {
  const isGuest = utterance.speaker === "guest";
  const reduceMotion = useReducedMotion();

  const body = (
    <article
      className={`border-l py-4 pl-4 ${
        isClimax
          ? "border-[color:var(--color-ink)] text-[length:var(--text-display)] leading-[var(--leading-tight)]"
          : isGuest
            ? "border-[color:var(--color-line)] text-[length:var(--text-lead)]"
            : "border-[color:var(--color-line)] text-xs text-[color:var(--color-label-ink)]"
      }`}
      style={!isGuest && !isClimax ? { fontFamily: "var(--font-label)" } : undefined}
    >
      <p className="max-w-[35ch]">{utterance.text}</p>
    </article>
  );

  if (isClimax && !reduceMotion) {
    return (
      <motion.div
        key={utterance.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {body}
      </motion.div>
    );
  }

  return body;
}
