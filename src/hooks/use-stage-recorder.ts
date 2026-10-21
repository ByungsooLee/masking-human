"use client";

import { useCallback, useRef, useState } from "react";

export function useStageRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const start = useCallback((stageEl: HTMLElement | null) => {
    if (!stageEl || recording) return false;
    const stream =
      typeof (stageEl as HTMLElement & { captureStream?: () => MediaStream }).captureStream ===
      "function"
        ? (stageEl as HTMLElement & { captureStream: () => MediaStream }).captureStream()
        : null;
    if (!stream) return false;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(250);
    recorderRef.current = rec;
    setRecording(true);
    return true;
  }, [recording]);

  const stop = useCallback((): Blob | null => {
    const rec = recorderRef.current;
    if (!rec) return null;
    return new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        recorderRef.current = null;
        chunksRef.current = [];
        setRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      rec.stop();
    }) as unknown as Blob | null;
  }, []);

  const stopAsync = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec) return null;
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        recorderRef.current = null;
        chunksRef.current = [];
        setRecording(false);
        resolve(blob.size > 0 ? blob : null);
      };
      rec.stop();
    });
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename = "live-stage.webm") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { recording, start, stopAsync, downloadBlob };
}
