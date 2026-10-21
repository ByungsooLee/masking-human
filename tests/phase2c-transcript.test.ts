import { describe, expect, it, beforeEach } from "vitest";
import { MemoryUtteranceRepository, clearUtterancesForTests } from "@/lib/voice/repositories/memory-utterance-repository";

describe("transcript confirmation flow", () => {
  const repo = new MemoryUtteranceRepository();

  beforeEach(() => clearUtterancesForTests());

  it("links confirmed text to interview turn id", async () => {
    const u = await repo.createFromStt({
      sessionId: "sess",
      originalTranscript: "STT raw",
      transcriptLanguage: "en",
      sourceAudioAssetId: "a1",
    });
    await repo.confirmTranscript({
      sessionId: "sess",
      utteranceId: u.id,
      confirmedTranscript: "Participant fixed",
    });
    await repo.linkInterviewTurn({
      sessionId: "sess",
      utteranceId: u.id,
      interviewTurnId: "turn-uuid",
    });
    const row = await repo.getById("sess", u.id);
    expect(row?.confirmedTranscript).toBe("Participant fixed");
    expect(row?.originalTranscript).toBe("STT raw");
    expect(row?.turnId).toBe("turn-uuid");
  });
});
