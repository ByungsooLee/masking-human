import { ensureContrastAa } from "./contrast-adjust";

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

export function sampleAccentFromImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  backgroundHex: string,
): string {
  const canvas = document.createElement("canvas");
  const w = 32;
  const h = 32;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#5a6a62";

  ctx.drawImage(source, 0, 0, width, height, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n === 0) return ensureContrastAa("#5a6a62", backgroundHex);
  const hex = rgbToHex(r / n, g / n, b / n);
  return ensureContrastAa(hex, backgroundHex);
}
