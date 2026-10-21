"use client";

import { useEffect } from "react";
import { sampleAccentFromImage } from "@/lib/color/accent-from-image";
import { useLiveStage } from "@/contexts/live-stage-context";

export function useStageAccent(active: boolean) {
  const { videoRef, stillUrl, useDemoPhoto, demoPhotoUrl, setAccentColor, mediaMode } = useLiveStage();

  useEffect(() => {
    if (!active) return;
    const ground = getComputedStyle(document.documentElement).getPropertyValue("--color-ground").trim() || "#e8ebe9";

    const applyFromImage = (img: HTMLImageElement) => {
      const c = sampleAccentFromImage(img, img.naturalWidth, img.naturalHeight, ground.startsWith("#") ? ground : "#e8ebe9");
      setAccentColor(c);
    };

    if (mediaMode === "video" && videoRef.current && videoRef.current.videoWidth > 0) {
      const v = videoRef.current;
      const c = sampleAccentFromImage(v, v.videoWidth, v.videoHeight, "#e8ebe9");
      setAccentColor(c);
      return;
    }

    const src = useDemoPhoto ? demoPhotoUrl : stillUrl;
    if (mediaMode === "still" && src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => applyFromImage(img);
      img.src = src;
    }
  }, [active, demoPhotoUrl, mediaMode, setAccentColor, stillUrl, useDemoPhoto, videoRef]);
}
