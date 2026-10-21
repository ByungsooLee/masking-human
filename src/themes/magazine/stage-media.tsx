"use client";

import { useEffect } from "react";
import { useLiveStage } from "@/contexts/live-stage-context";

type Props = {
  cameraStream: MediaStream | null;
  className?: string;
};

export function MagazineStageMedia({ cameraStream, className = "" }: Props) {
  const { videoRef, mediaMode, stillUrl, useDemoPhoto, demoPhotoUrl } = useLiveStage();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (mediaMode === "video" && cameraStream) {
      v.srcObject = cameraStream;
      void v.play().catch(() => undefined);
    } else {
      v.srcObject = null;
    }
  }, [cameraStream, mediaMode, videoRef]);

  if (mediaMode === "none") return null;

  if (mediaMode === "still") {
    const src = useDemoPhoto ? demoPhotoUrl : stillUrl;
    if (!src) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
