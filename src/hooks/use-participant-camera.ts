"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useParticipantCamera(enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const video = all.filter((d) => d.kind === "videoinput");
      setDevices(video);
      if (!deviceId && video[0]?.deviceId) setDeviceId(video[0].deviceId);
    } catch {
      setDevices([]);
    }
  }, [deviceId]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return null;
    stop();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setReady(true);
      await refreshDevices();
      return stream;
    } catch {
      setError("camera_unavailable");
      setReady(false);
      return null;
    }
  }, [deviceId, enabled, refreshDevices, stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    void start();
    return () => stop();
  }, [enabled, deviceId, start, stop]);

  return {
    streamRef,
    getStream: () => streamRef.current,
    devices,
    deviceId,
    setDeviceId,
    error,
    ready,
    refreshDevices,
    restart: start,
    stop,
  };
}
