/** Client-safe RealtimeSession config (aligned with server session). */
export function buildRealtimeSessionConfig(language: "ja" | "en" = "ja") {
  return {
    outputModalities: ["audio"] as ("text" | "audio")[],
    audio: {
      input: {
        transcription: {
          model: "gpt-live-transcribe" as const,
          delay: "low" as const,
          ...(language === "ja" ? { languages: ["ja"] } : {}),
        },
      },
    },
  };
}
