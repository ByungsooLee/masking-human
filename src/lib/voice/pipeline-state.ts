export interface VoicePipelineState {
  hasRecordingConsent: boolean;
  hasAiConversationConsent: boolean;
  isTtsPlaying: boolean;
  isRecording: boolean;
  isSending: boolean;
  micPermission: "granted" | "denied" | "prompt" | "unknown";
}

export function shouldBlockRecordingDuringTts(isTtsPlaying: boolean): boolean {
  return isTtsPlaying;
}

export function canStartAnswerRecording(state: VoicePipelineState): boolean {
  if (!state.hasRecordingConsent || !state.hasAiConversationConsent) return false;
  if (state.micPermission !== "granted") return false;
  if (state.isTtsPlaying || state.isRecording || state.isSending) return false;
  return true;
}

export function canSubmitTranscript(text: string, state: VoicePipelineState): boolean {
  if (state.isSending) return false;
  if (!state.hasRecordingConsent || !state.hasAiConversationConsent) return false;
  return text.trim().length > 0;
}

export function canRetryStt(state: VoicePipelineState): boolean {
  return state.hasRecordingConsent && !state.isRecording && !state.isSending;
}
