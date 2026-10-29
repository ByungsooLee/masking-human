import type { ArchivedSession } from "@/lib/archive/session-archive";
import { buildEditCsv, buildSrt } from "@/lib/magazine-flow/export-transcript";
import { buildSelfAnalysisMap, buildMindMapText } from "@/lib/graph/self-analysis-map";
import { buildEditingReplay } from "./editing-replay";
import { buildEditorialReviewExport } from "@/lib/archive/editorial-review";
import { buildUsageExport } from "@/lib/usage/response-ledger";

export type EditingFile = { name: string; blob: Blob };
export function mediaExtension(blob: Blob): string {
  return blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("wav") ? "wav" : "webm";
}
function textFile(name: string, content: string, type = "text/plain;charset=utf-8"): EditingFile { return { name, blob: new Blob([content], { type }) }; }
export function buildEditingFiles(session: ArchivedSession): EditingFile[] {
  const language = session.prepare.language;
  const map = buildSelfAnalysisMap(session.transcript);
  const events = session.editingTimeline ?? [];
  const rawTranscript = session.transcript.map((row) => ({ ...row }));
  const frames = events.filter((event) => event.type === "map_update");
  const audio = [];
  const files: EditingFile[] = [];
  if (session.recordingBlob?.size) { const name = `audio/mix-original.${mediaExtension(session.recordingBlob)}`; files.push({ name, blob: session.recordingBlob }); audio.push({ role: "mix", file: name, startMs: 0, note: "May include optional device video." }); }
  for (const kind of ["guest", "ai"] as const) {
    const track = session.audioStems?.[kind];
    if (!track?.blob.size) continue;
    const name = `audio/${kind}-original.${mediaExtension(track.blob)}`;
    files.push({ name, blob: track.blob }); audio.push({ role: kind, file: name, startMs: track.startMs, stopMs: track.stopMs });
  }
  files.push(
    textFile("usage.json", JSON.stringify(buildUsageExport(session.id, session.usageLedger), null, 2), "application/json"),
    textFile("editorial-review.json", JSON.stringify(buildEditorialReviewExport(session.id, session.transcript), null, 2), "application/json"),
    textFile("replay.html", buildEditingReplay(session, files.find((file) => file.name.startsWith("audio/mix-original"))?.name ?? null), "text/html;charset=utf-8"),
    textFile("README.txt", "PRIVATE EDITING MATERIALS — NOT FOR PUBLIC SHARING\n\nOriginal audio, raw transcripts and event logs may include excluded speech. Apply privacy edits to every track before publishing. A signed release does not mean all original material is safe to publish. Consent PDFs, signatures and email addresses are not included.\n\nTime origin is app recording start, in milliseconds. Speech intervals and event observations are estimates, not sample/frame-accurate synchronization. Align the external camera using recorded clap/beep and verify drift at the end. Separate recorders may have encoder delay.\n\nLegacy entries cannot recover missing audio stems or live map events. Demo recordings are not real interview audio.\n\nSRT and edit CSV omit excluded entries. raw/ retains original observations. map-final represents the edited transcript; raw map events can still contain excluded content.\n\nThis bundle does not include external camera video or generated animated MP4 chat/map clips. It contains source audio and timed data for a later render/export step.\n"),
    textFile("manifest.json", JSON.stringify({ version: 1, sessionId: session.id, recordedAt: session.recordedAt ?? null, language, timing: { origin: "recording-start", unit: "milliseconds", precision: "observed wall-clock events and estimated speech intervals", encoderDelayUnknown: true }, slateAtMs: session.slateAtMs, hasSignedPublicationConsent: Boolean(session.releaseConsent), audio, audioSampleRate: session.audioStems?.sampleRate ?? null, audioIssues: session.audioStems?.issues ?? [], hasLiveEvents: events.length > 0, eventCount: events.length, mapRenderer: "self-analysis-map/source-data-v1", animation: { nodePopMs: 1150, haloMs: 1250, branchMs: 950, note: "Reference settings, not a frame-accurate video recording." } }, null, 2), "application/json"),
    textFile("subtitles.srt", buildSrt(session.transcript, language)),
    textFile("edit.csv", buildEditCsv(session.transcript), "text/csv;charset=utf-8"),
    textFile("transcript-edited.json", JSON.stringify(session.transcript.filter((row) => !row.excluded), null, 2), "application/json"),
    textFile("map-final.json", JSON.stringify(map, null, 2), "application/json"),
    textFile("map-final.txt", buildMindMapText(map, session.prepare.guestName || (language === "en" ? "Self" : "自分"), language)),
    textFile("raw/transcript.json", JSON.stringify(rawTranscript, null, 2), "application/json"),
    textFile("raw/events.json", JSON.stringify(events, null, 2), "application/json"),
    textFile("raw/map-cues.csv", "\uFEFFindex,start_ms,file\r\n" + frames.map((frame, index) => `${index + 1},${frame.atMs},map-${String(index + 1).padStart(4, "0")}.json`).join("\r\n"), "text/csv;charset=utf-8"),
  );
  frames.forEach((frame, index) => files.push(textFile(`raw/map-${String(index + 1).padStart(4, "0")}.json`, JSON.stringify(frame, null, 2), "application/json")));
  return files;
}

export function encodeWav(audio: Pick<AudioBuffer, "numberOfChannels" | "length" | "sampleRate" | "getChannelData">): Blob {
  const channels = audio.numberOfChannels;
  const dataSize = audio.length * channels * 2;
  if (dataSize > 0xffffffff - 44) throw new Error("WAV too large");
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const ascii = (at: number, value: string) => { for (let index = 0; index < value.length; index++) view.setUint8(at + index, value.charCodeAt(index)); };
  ascii(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); ascii(8, "WAVE"); ascii(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, audio.sampleRate, true); view.setUint32(28, audio.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
  ascii(36, "data"); view.setUint32(40, dataSize, true);
  const planes = Array.from({ length: channels }, (_, index) => audio.getChannelData(index));
  let offset = 44;
  for (let frame = 0; frame < audio.length; frame++) for (let channel = 0; channel < channels; channel++) { const sample = Math.max(-1, Math.min(1, planes[channel][frame])); view.setInt16(offset, Math.round(sample * (sample < 0 ? 32768 : 32767)), true); offset += 2; }
  return new Blob([buffer], { type: "audio/wav" });
}
export async function convertAudioToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try { return encodeWav(await context.decodeAudioData(await blob.arrayBuffer())); }
  finally { await context.close(); }
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
