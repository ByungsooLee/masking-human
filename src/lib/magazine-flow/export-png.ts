import { toPng } from "html-to-image";

export async function captureElementToPng(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  return toPng(element, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
    },
  });
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadText(filename: string, text: string, mime = "application/json") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
