import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

describe("microphone sample conversion", () => {
  it.each([44100, 48000])("converts %s Hz input to 16kHz without monitoring microphone audio", (rate) => {
    const captured: Float32Array[] = [];
    let createProcessor!: new () => { process: (input: Float32Array[][], output: Float32Array[][]) => boolean };
    runInNewContext(readFileSync("public/audio/interview-capture.js", "utf8"), {
      sampleRate: rate,
      Float32Array,
      AudioWorkletProcessor: class { port = { postMessage: (frame: Float32Array) => captured.push(frame) }; },
      registerProcessor: (_name: string, constructor: typeof createProcessor) => { createProcessor = constructor; },
    });
    const processor = new createProcessor();
    for (let index = 0; index < Math.floor(rate / 128); index += 1) {
      const output = new Float32Array(128).fill(1);
      expect(processor.process([[new Float32Array(128).fill(0.5)]], [[output]])).toBe(true);
      expect(output.every((sample) => sample === 0)).toBe(true);
    }
    const samples = captured.reduce((total, frame) => total + frame.length, 0);
    expect(samples).toBeGreaterThan(Math.floor(rate / 128) * 128 * 16000 / rate - 1100);
    expect(samples).toBeLessThanOrEqual(16000);
    expect(captured.every((frame) => frame.every((sample) => Math.abs(sample - 0.5) < 0.00001))).toBe(true);
  });
});
