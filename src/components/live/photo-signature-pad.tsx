"use client";

import { useRef } from "react";

export function PhotoSignaturePad({ en, disabled, onChange }: { en: boolean; disabled: boolean; onChange: (signature: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const finish = () => { drawing.current = false; if (hasInk.current && canvas.current) onChange(canvas.current.toDataURL("image/png")); };
  return <div className="space-y-2">
    <p>{en ? "Your signature — draw once with a finger or pen" : "サイン（指やペンで一度だけ）"}</p>
    <canvas ref={canvas} width={1000} height={300} aria-label={en ? "Signature canvas" : "署名欄"} className="h-28 w-full touch-none rounded-xl border border-[color:var(--color-thread)] bg-white" style={{ pointerEvents: disabled ? "none" : "auto" }}
      onPointerDown={(event) => { if (disabled) return; const target = event.currentTarget; target.setPointerCapture(event.pointerId); const box = target.getBoundingClientRect(); const context = target.getContext("2d")!; context.beginPath(); context.moveTo((event.clientX - box.left) * 1000 / box.width, (event.clientY - box.top) * 300 / box.height); drawing.current = true; }}
      onPointerMove={(event) => { if (!drawing.current || disabled) return; const box = event.currentTarget.getBoundingClientRect(); const context = event.currentTarget.getContext("2d")!; context.strokeStyle = "#2A2A28"; context.lineWidth = 4; context.lineCap = "round"; context.lineTo((event.clientX - box.left) * 1000 / box.width, (event.clientY - box.top) * 300 / box.height); context.stroke(); hasInk.current = true; }}
      onPointerUp={finish} onPointerCancel={finish} />
    <button type="button" disabled={disabled} className="ui-btn-sub min-h-12" onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 1000, 300); hasInk.current = false; drawing.current = false; onChange(""); }}>{en ? "Clear" : "書き直す"}</button>
  </div>;
}
