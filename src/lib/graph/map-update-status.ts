import type { Utterance } from "@/lib/realtime/types";
import { buildSelfAnalysisMap } from "./self-analysis-map";

export function summarizeMapUpdate(utterances: readonly Utterance[]) {
  const guests = utterances.filter((row) => row.speaker === "guest" && row.text.trim());
  const latest = guests.at(-1);
  if (!latest) return { added: 0, updated: 0, turnId: null };
  const current = buildSelfAnalysisMap(guests);
  const previous = buildSelfAnalysisMap(guests.filter((row) => row.id !== latest.id));
  const previousIds = new Set(previous.nodes.map((node) => node.id));
  return {
    added: current.nodes.filter((node) => !previousIds.has(node.id)).length,
    updated: current.nodes.filter((node) => previousIds.has(node.id) && node.evidenceIds.includes(latest.id)).length,
    turnId: latest.id,
  };
}

export function inputStateFromTransportEvent(event: { type: string }) {
  switch (event.type) {
    case "input_audio_buffer.speech_started": return "speaking" as const;
    case "input_audio_buffer.speech_stopped": return "transcribing" as const;
    case "conversation.item.input_audio_transcription.completed": return "idle" as const;
    case "conversation.item.input_audio_transcription.failed": return "failed" as const;
    default: return null;
  }
}
