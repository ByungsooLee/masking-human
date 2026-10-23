import { describe, expect, it } from "vitest";
import { createDemoAudio } from "@/lib/recording/demo-audio";

describe("synthetic demo recording", () => {
  it("creates a nonempty PCM WAV with the requested duration and sync tone", async () => {
    const blob = createDemoAudio(2_000, true);
    const buffer = await blob.arrayBuffer();
    const data = new DataView(buffer);
    expect(blob.type).toBe("audio/wav");
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe("RIFF");
    expect(data.getUint32(24, true)).toBe(8_000);
    expect(data.getUint32(40, true) / data.getUint32(28, true)).toBe(2);
    expect(new Int16Array(buffer.slice(44, 44 + 4_800)).some((sample) => sample !== 0)).toBe(true);
    expect(new Int16Array(buffer.slice(44 + 4_800)).every((sample) => sample === 0)).toBe(true);
  });

  it("supports silence without real recording APIs", async () => {
    const data = await createDemoAudio(1_000, false).arrayBuffer();
    expect(new Int16Array(data.slice(44)).every((sample) => sample === 0)).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, 660_001])("rejects invalid duration %s", (duration) => {
    expect(() => createDemoAudio(duration, true)).toThrow("Invalid demo audio duration");
  });
});
