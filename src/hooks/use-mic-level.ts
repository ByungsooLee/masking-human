"use client";

import { useEffect, useRef, useState } from "react";

export type MicLevelState = {
  /** 0–100, smoothed; updated about 10 times per second. */
  level: number;
  /** True while a voice-level sound was heard within the last 1.5s. */
  hearing: boolean;
  denied: boolean;
  /** Latest unsmoothed 0–1 value for animation loops that read every frame. */
  rawRef: React.RefObject<number>;
};

export function useMicLevel(enabled = true): MicLevelState {
  const [level, setLevel] = useState(0);
  const [hearing, setHearing] = useState(false);
  const [denied, setDenied] = useState(false);
  const rawRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer = 0;
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(s).connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        let smoothed = 0;
        let lastVoiceAt = -Infinity;
        timer = window.setInterval(() => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += v * v;
          const db = 20 * Math.log10(Math.sqrt(sum / data.length) || 1e-8);
          // -60dB (quiet room) to -10dB (close voice) mapped to 0–100.
          const value = Math.max(0, Math.min(100, ((db + 60) / 50) * 100));
          rawRef.current = value / 100;
          smoothed = value > smoothed ? value : smoothed * 0.8 + value * 0.2;
          setLevel(Math.round(smoothed));
          const now = performance.now();
          if (value >= 45) lastVoiceAt = now;
          setHearing(now - lastVoiceAt < 1500);
        }, 50);
      })
      .catch(() => setDenied(true));
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [enabled]);

  return { level, hearing, denied, rawRef };
}
