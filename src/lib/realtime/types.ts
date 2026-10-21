export type Speaker = "ai" | "host" | "guest";

export type Utterance = {
  id: string;
  speaker: Speaker;
  text: string;
  startedAt: number;
  endedAt: number;
};

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

export type ListeningPhase =
  | "hidden"
  | "connecting"
  | "waiting_ai"
  | "ai_speaking"
  | "guest_may_speak";
