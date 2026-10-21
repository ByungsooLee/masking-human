"use client";

import { useCallback, useRef, useState } from "react";
import { pickRecorderMimeType, playSlateBeep } from "@/lib/recording/slate-beep";
import { createSessionClock, type SessionClock } from "@/lib/recording/session-clock";

export type SessionRecorderState = {
  recording: boolean;
  clock: SessionClock;
  slateAtMs: number | null;
  blob: Blob | null;
  blobUrl: string | null;
  error: string | null;
};

export function useSessionRecorder() {
  const clockRef = useRef(createSessionClock());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [slateAtMs, setSlateAtMs] = useState<number | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return blob;
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const out = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        void audioCtxRef.current?.close();
        audioCtxRef.current = null;
        setRecording(false);
        setBlob(out);
        revokeUrl();
        const url = URL.createObjectURL(out);
        setBlobUrl(url);
        resolve(out.size > 0 ? out : null);
      };
      rec.stop();
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

      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: options.includeCamera ? { facingMode: "user" } : false,
        };
        const mic = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mic;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(new MediaStream(mic.getAudioTracks())).connect(dest);

        const tracks = [...dest.stream.getAudioTracks()];
        if (options.includeCamera) {
          for (const t of mic.getVideoTracks()) tracks.push(t);
        }
        const combined = new MediaStream(tracks);
        const mime = pickRecorderMimeType();
        const rec = mime ? new MediaRecorder(combined, { mimeType: mime }) : new MediaRecorder(combined);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        clockRef.current.start();
        rec.start(250);
        recorderRef.current = rec;
        setRecording(true);

        if (options.playBeep) {
          await playSlateBeep(ctx, dest);
          setSlateAtMs(clockRef.current.elapsedMs());
        }

        return true;
      } catch {
        setError("recorder_unavailable");
        clockRef.current.reset();
        return false;
      }
    },
    [revokeUrl],
  );

  /** Mock: silent audio file spanning durationMs for edit pipeline tests. */
  const startMockSilent = useCallback(async (durationMs: number, playBeep: boolean) => {
    setError(null);
    setBlob(null);
    revokeUrl();
    setBlobUrl(null);
    setSlateAtMs(null);
    clockRef.current.start();
    if (playBeep) {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        await playSlateBeep(ctx, dest);
        setSlateAtMs(clockRef.current.elapsedMs());
        const rec = new MediaRecorder(dest.stream, { mimeType: pickRecorderMimeType() });
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(250);
        recorderRef.current = rec;
        setRecording(true);
        setTimeout(() => {
          void stop();
        }, durationMs + 500);
        return true;
      } catch {
        setSlateAtMs(0);
      }
    }
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      const empty = new Blob([], { type: "audio/webm" });
      setBlob(empty);
      setBlobUrl("");
    }, durationMs);
    return true;
  }, [revokeUrl, stop]);

  const reset = useCallback(() => {
    void stop();
    clockRef.current.reset();
    setSlateAtMs(null);
    setBlob(null);
    revokeUrl();
    setBlobUrl(null);
    setError(null);
  }, [revokeUrl, stop]);

  return {
    recording,
    clock: clockRef.current,
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
