"use client";

import type { ArchivedSession } from "@/lib/archive/session-archive";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMimeType, playSlateBeep } from "@/lib/recording/slate-beep";
import { createSessionClock, type SessionClock } from "@/lib/recording/session-clock";
import { AudioStemCapture, EditingCapture, type AudioStems, type EditingEvent } from "@/lib/recording/editing-capture";
import { createDemoAudio } from "@/lib/recording/demo-audio";

export type SessionRecorderState = {
  recording: boolean;
  clock: SessionClock;
  slateAtMs: number | null;
  blob: Blob | null;
  blobUrl: string | null;
  error: string | null;
};

export function useSessionRecorder(initial?: ArchivedSession | null) {
  const [clock] = useState(createSessionClock);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const aiSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const editingRef = useRef(new EditingCapture(initial?.editingTimeline));
  const stemCaptureRef = useRef<AudioStemCapture | null>(null);
  const stemResultRef = useRef<AudioStems | null>(initial?.audioStems ?? null);
  const [audioStems, setAudioStems] = useState<AudioStems | null>(initial?.audioStems ?? null);
  const [editingTimeline, setEditingTimeline] = useState<EditingEvent[]>(initial?.editingTimeline ?? []);
  const captureEditingEvent = useCallback((type: EditingEvent["type"], data: unknown) => { editingRef.current.observe(type, data, clock.elapsedMs()); }, [clock]);
  const getEditingTimeline = useCallback(() => editingRef.current.snapshot(), []);
  const getAudioStems = useCallback(() => stemResultRef.current, []);
  const [recording, setRecording] = useState(false);
  const [slateAtMs, setSlateAtMs] = useState<number | null>(initial?.slateAtMs ?? null);
  const slateTimeRef = useRef<number | null>(initial?.slateAtMs ?? null);
  const [blob, setBlob] = useState<Blob | null>(initial?.recordingBlob ?? null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const initialBlob = initial?.recordingBlob;
  useEffect(() => {
    if (!initialBlob) return;
    const url = URL.createObjectURL(initialBlob);
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setBlobUrl(url); });
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [initialBlob]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    void stemCaptureRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    aiSourceRef.current?.disconnect();
    const context = audioCtxRef.current;
    if (context && context.state !== "closed") void context.close();
  }, []);

  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  const revokeUrl = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec) {
      setRecording(false);
      setEditingTimeline(editingRef.current.snapshot());
      return blob;
    }
    return new Promise((resolve) => {
      const finalize = async () => {
        const stems = await stemCaptureRef.current?.stop();
        stemResultRef.current = stems ?? null;
        stemCaptureRef.current = null;
        setAudioStems(stems ?? null);
        setEditingTimeline(editingRef.current.snapshot());
        const out = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        aiSourceRef.current?.disconnect();
        aiSourceRef.current = null;
        destinationRef.current = null;
        void audioCtxRef.current?.close();
        audioCtxRef.current = null;
        setRecording(false);
        setBlob(out);
        revokeUrl();
        const url = URL.createObjectURL(out);
        setBlobUrl(url);
        resolve(out.size > 0 ? out : null);
      };
      rec.onstop = finalize;
      if (rec.state === "inactive") void finalize();
      else rec.stop();
    });
  }, [blob, revokeUrl]);

  const startWithSlate = useCallback(
    async (options: { includeCamera: boolean; playBeep: boolean }) => {
      setError(null);
      setBlob(null);
      revokeUrl();
      setBlobUrl(null);
      setSlateAtMs(null);
      chunksRef.current = [];
      editingRef.current.reset();
      stemResultRef.current = null;
      setAudioStems(null);
      setEditingTimeline([]);

      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: options.includeCamera ? { facingMode: "user" } : false,
        };
        const mic = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mic;

        const ctx = new AudioContext();
        await ctx.resume();
        audioCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        destinationRef.current = dest;
        ctx.createMediaStreamSource(new MediaStream(mic.getAudioTracks())).connect(dest);

        const tracks = [...dest.stream.getAudioTracks()];
        if (options.includeCamera) {
          for (const t of mic.getVideoTracks()) tracks.push(t);
        }
        const combined = new MediaStream(tracks);
        const mime = pickRecorderMimeType(options.includeCamera);
        const rec = mime ? new MediaRecorder(combined, { mimeType: mime }) : new MediaRecorder(combined);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        clock.start();
        rec.start(250);
        recorderRef.current = rec;
        stemCaptureRef.current = new AudioStemCapture(ctx, mic, () => clock.elapsedMs());
        ctx.addEventListener("statechange", () => captureEditingEvent("audio_state", { state: ctx.state }));
        setRecording(true);

        if (options.playBeep) {
          slateTimeRef.current = clock.elapsedMs();
          setSlateAtMs(slateTimeRef.current);
          await playSlateBeep(ctx, dest);
        }

        return true;
      } catch {
        setError("recorder_unavailable");
        clock.reset();
        return false;
      }
    },
    [revokeUrl, clock, captureEditingEvent],
  );

  /** Mock fixture: no microphone, camera, or MediaRecorder dependency. */
  const startMockSilent = useCallback(async (durationMs: number, playBeep: boolean) => {
    setError(null);
    revokeUrl();
    const fixture = createDemoAudio(durationMs, playBeep);
    setBlob(fixture);
    setBlobUrl(URL.createObjectURL(fixture));
    slateTimeRef.current = 0;
    setSlateAtMs(0);
    editingRef.current.reset();
    stemResultRef.current = null;
    setAudioStems(null);
    setEditingTimeline([]);
    clock.start();
    setRecording(true);
    return true;
  }, [revokeUrl, clock]);

  const reset = useCallback(() => {
    void stop();
    clock.reset();
    setSlateAtMs(null);
    setBlob(null);
    revokeUrl();
    setBlobUrl(null);
    setError(null);
  }, [revokeUrl, stop, clock]);

  const getSlateAtMs = useCallback(() => slateTimeRef.current, []);

  const attachAiAudio = useCallback((stream: MediaStream) => {
    const context = audioCtxRef.current;
    const destination = destinationRef.current;
    if (!context || !destination) return;
    aiSourceRef.current?.disconnect();
    const source = context.createMediaStreamSource(stream);
    source.connect(destination);
    stemCaptureRef.current?.attach(source);
    aiSourceRef.current = source;
  }, []);

  return {
    recording,
    audioStems,
    editingTimeline,
    captureEditingEvent,
    getEditingTimeline,
    getAudioStems,
    attachAiAudio,
    getSlateAtMs,
    clock,
    slateAtMs,
    blob,
    blobUrl,
    error,
    startWithSlate,
    startMockSilent,
    stop,
    reset,
  };
}
