/** Client-safe RealtimeSession config (aligned with server session). */
export function buildRealtimeSessionConfig() {
  return {
    outputModalities: ["audio"] as ("text" | "audio")[],
    audio: {
      input: {
        transcription: {
          model: "gpt-live-transcribe" as const,
          delay: "low" as const,
          languages: ["ja", "en"],
        },
      },
    },
  };
}
