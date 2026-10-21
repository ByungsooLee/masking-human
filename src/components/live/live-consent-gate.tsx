"use client";

import { useState } from "react";
import type { LiveUiCopy } from "@/lib/i18n/live-ui";

type Props = {
  copy: LiveUiCopy;
  open: boolean;
  needInterviewSession: boolean;
  onConfirm: (opts: { ai: boolean; photoVideo: boolean; recording: boolean }) => void;
  onCancel: () => void;
};

export function LiveConsentGate({ copy, open, needInterviewSession, onConfirm, onCancel }: Props) {
  const [ai, setAi] = useState(true);
  const [photoVideo, setPhotoVideo] = useState(false);
  const [recording, setRecording] = useState(false);

  if (!open) return null;

  return (
    <div
      className="recording-exclude fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-consent-title"
    >
      <div className="theme-ground max-w-md border border-[color:var(--color-line)] p-6">
        <h2 id="live-consent-title" className="mb-4 text-[length:var(--text-lead)]">
          {copy.consentTitle}
        </h2>
        <ul className="mb-6 space-y-3 text-[length:var(--text-body)]">
          <li>
            <label className="flex gap-2">
              <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />
              <span>{copy.consentAi}</span>
            </label>
          </li>
          <li>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={photoVideo}
                onChange={(e) => setPhotoVideo(e.target.checked)}
              />
              <span>{copy.consentPhotoVideo}</span>
            </label>
          </li>
          {needInterviewSession && (
            <li>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={recording}
                  onChange={(e) => setRecording(e.target.checked)}
                />
                <span>{copy.consentRecording}</span>
              </label>
            </li>
          )}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[color:var(--color-line)] px-4 py-2 text-[length:var(--text-body)]"
          >
            {copy.consentCancel}
          </button>
          <button
            type="button"
            disabled={!ai}
            onClick={() => onConfirm({ ai, photoVideo, recording })}
            className="border border-[color:var(--color-ink)] px-4 py-2 text-[length:var(--text-body)]"
          >
            {copy.consentConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
