"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Utterance } from "@/lib/realtime/types";
import { wrapSubtitleLines } from "@/themes/shared/wrap-subtitle";

type Props = {
  utterance: Utterance;
  isClimax: boolean;
};

export function CinemaUtteranceBlock({ utterance, isClimax }: Props) {
  const isGuest = utterance.speaker === "guest";
  const lines = wrapSubtitleLines(utterance.text);
  const reduceMotion = useReducedMotion();

  const guestBody = (
    <div
      className={`py-3 text-center ${
        isClimax ? "text-[length:var(--text-display)] leading-[var(--leading-tight)]" : "text-[length:var(--text-lead)]"
      }`}
    >
      {lines.map((line) => (
        <p key={line} className="mx-auto max-w-[18em]">
          {line}
        </p>
      ))}
    </div>
  );

  return (
    <div aria-hidden={!isGuest}>
      {isGuest ? (
        isClimax && !reduceMotion ? (
          <motion.div
            key={utterance.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          >
            {guestBody}
          </motion.div>
        ) : (
          guestBody
        )
      ) : (
        <p className="sr-only text-sm text-[color:var(--color-ink-muted)]">{utterance.text}</p>
      )}
    </div>
  );
}
