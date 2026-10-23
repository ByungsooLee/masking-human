import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { buildEditingFiles, encodeWav } from "@/lib/recording/editing-files";
import { buildEditingZip } from "@/lib/recording/editing-zip";
import { AudioStemCapture, EditingCapture } from "@/lib/recording/editing-capture";
import type { ArchivedSession } from "@/lib/archive/session-archive";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { buildEditingReplay } from "@/lib/recording/editing-replay";
import { Script } from "node:vm";

afterEach(() => vi.unstubAllGlobals());
const session: ArchivedSession = { id: "edit-session", savedAt: "2026-10-23T00:00:00Z", prepare: useMagazineFlowStore.getInitialState().prepare, transcript: [
  { id: "keep", speaker: "guest", text: "家族との時間が大切です。", startedAt: 500, endedAt: 2000 },
  { id: "private", speaker: "guest", text: "PRIVATE-EXCLUDED", startedAt: 2100, endedAt: 3000, excluded: true },
], draft: null, slateAtMs: 100, recordingBlob: new Blob(["mix"], { type: "audio/mp4" }), audioStems: { guest: { blob: new Blob(["guest"], { type: "audio/webm" }), startMs: 2, stopMs: 4000 }, sampleRate: 48000, issues: ["ai_audio_not_attached"] }, editingTimeline: [{ atMs: 2200, type: "map_update", data: { nodes: [] } }] };

describe("private editing downloads", () => {
  it("captures deduplicated, immutable observations on a monotonic timeline", () => {
    const capture = new EditingCapture();
    const data = { text: "first" };
    capture.observe("chat_update", data, 100);
    capture.observe("chat_update", data, 101);
    data.text = "second";
    capture.observe("chat_update", data, 90);
    const rows = capture.snapshot();
    expect(rows.map((row) => row.atMs)).toEqual([100, 100]);
    expect(rows[0].data).toEqual({ text: "first" });
    rows[0].data = null;
    expect(capture.snapshot()[0].data).toEqual({ text: "first" });
    capture.reset(); expect(capture.snapshot()).toEqual([]);
  });
  it("exports raw originals separately from excluded / edited material without consent PII", async () => {
    const files = buildEditingFiles(session);
    const content = async (name: string) => files.find((file) => file.name === name)!.blob.text();
    expect(files.map((file) => file.name)).toContain("audio/guest-original.webm");
    expect(files.map((file) => file.name)).not.toContain("audio/ai-original.webm");
    expect(await content("subtitles.srt")).not.toContain("PRIVATE-EXCLUDED");
    expect(await content("edit.csv")).not.toContain("PRIVATE-EXCLUDED");
    expect(await content("map-final.json")).not.toContain("PRIVATE-EXCLUDED");
    expect(await content("raw/transcript.json")).toContain("PRIVATE-EXCLUDED");
    expect(JSON.parse(await content("manifest.json"))).toMatchObject({ hasLiveEvents: true, slateAtMs: 100, audioSampleRate: 48000 });
    expect(await content("raw/map-cues.csv")).toContain("2200,map-0001.json");
    expect(files.map((file) => file.name).join(" ")).not.toContain("consent");
    expect(await content("README.txt")).toContain("does not include external camera video");
  });
  it("does not invent missing tracks / past events for legacy history", async () => {
    const files = buildEditingFiles({ ...session, audioStems: undefined, editingTimeline: undefined, recordingBlob: undefined });
    expect(files.some((file) => file.name.startsWith("audio/"))).toBe(false);
    const manifest = JSON.parse(await files.find((file) => file.name === "manifest.json")!.blob.text());
    expect(manifest.hasLiveEvents).toBe(false); expect(manifest.audio).toEqual([]);
  });
  it("creates a valid stored ZIP with UTF-8 names and standard CRC32", async () => {
    const bytes = await (await buildEditingZip([{ name: "test.txt", blob: new Blob(["123456789"]) }, { name: "日本語.txt", blob: new Blob(["hello"]) }])).arrayBuffer();
    const view = new DataView(bytes);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x800);
    expect(view.getUint32(14, true)).toBe(0xcbf43926);
    const end = bytes.byteLength - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50);
  });
  it("provides an offline replay without injecting transcript HTML into executable code", () => {
    const html = buildEditingReplay({ ...session, transcript: [{ ...session.transcript[0], text: "</script><img src=x onerror=alert(1)>" }] }, "audio/mix-original.mp4");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("\\u003c/script>");
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(() => new Script(script)).not.toThrow();
    expect(script).toContain("textContent=row.speaker");
    expect(script).toContain("audio.currentTime");
  });
  it("encodes interleaved signed 16-bit WAV with correct duration / sample rate", async () => {
    const blob = encodeWav({ numberOfChannels: 2, length: 2, sampleRate: 48000, getChannelData: (channel) => new Float32Array(channel ? [0.5, -0.5] : [1, -1]) });
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.type).toBe("audio/wav"); expect(blob.size).toBe(52);
    expect(view.getUint16(22, true)).toBe(2); expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getInt16(44, true)).toBe(32767); expect(view.getInt16(46, true)).toBe(16384);
    expect(view.getInt16(48, true)).toBe(-32768); expect(view.getInt16(50, true)).toBe(-16384);
  });
  it("keeps editing controls in history and records observations without adding participant controls", () => {
    const history = readFileSync("src/components/live/archive-session-detail.tsx", "utf8");
    expect(history).toContain("<HistoryEditingDownloads");
    for (const name of ["phase-prepare", "phase-conversation", "phase-results"]) expect(readFileSync(`src/components/magazine-flow/${name}.tsx`, "utf8")).not.toContain("<HistoryEditingDownloads");
    expect(readFileSync("src/components/live/conversation-workspace.tsx", "utf8")).toContain('onCapture?.("map_update"');
    expect(readFileSync("src/components/magazine-flow/phase-results.tsx", "utf8")).toContain("audioStems: recorder.audioStems");
  });
});

describe("separate audio stems", () => {
  it("reports unsupported separate capture instead of inventing tracks", async () => {
    vi.stubGlobal("MediaRecorder", class { constructor() { throw new Error("Not supported"); } });
    vi.stubGlobal("MediaStream", class { getAudioTracks() { return []; } });
    const context = { sampleRate: 44100, createMediaStreamDestination: () => ({ stream: {} }), createMediaStreamSource: () => ({ connect: vi.fn() }) } as unknown as AudioContext;
    const capture = new AudioStemCapture(context, { getAudioTracks: () => [] } as unknown as MediaStream, () => 0);
    const result = await capture.stop();
    expect(result.guest).toBeUndefined(); expect(result.ai).toBeUndefined();
    expect(result.issues).toEqual(["guest_stem_unavailable", "ai_stem_unavailable", "ai_audio_not_attached"]);
  });
  it("captures guest and AI in one context and stops idempotently", async () => {
    const recorders: FakeRecorder[] = [];
    class FakeRecorder {
      state = "inactive"; mimeType = "audio/mp4";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() { recorders.push(this); }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(["stem"]) }); this.onstop?.(); }); }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("MediaStream", class { getAudioTracks() { return []; } });
    const connect = vi.fn();
    const context = { sampleRate: 48000, createMediaStreamDestination: () => ({ stream: {} }), createMediaStreamSource: () => ({ connect }) } as unknown as AudioContext;
    const mic = { getAudioTracks: () => [] } as unknown as MediaStream;
    let time = 2;
    const capture = new AudioStemCapture(context, mic, () => time);
    time = 100; capture.attach({ connect } as unknown as MediaStreamAudioSourceNode);
    time = 4000;
    const first = capture.stop();
    const second = capture.stop();
    expect(first).toBe(second);
    const result = await first;
    expect(result).toMatchObject({ sampleRate: 48000, aiAttachedAtMs: 100, issues: [] });
    expect(await result.guest!.blob.text()).toBe("stem");
    expect(await result.ai!.blob.text()).toBe("stem");
    expect(result.guest?.startMs).toBe(2);
    expect(recorders.every((recorder) => recorder.state === "inactive")).toBe(true);
  });
});
