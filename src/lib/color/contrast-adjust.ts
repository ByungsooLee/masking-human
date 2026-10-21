function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: string, bg: string): number {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return 1;
  const l1 = luminance(f.r, f.g, f.b);
  const l2 = luminance(b.r, b.g, b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureContrastAa(accentHex: string, backgroundHex: string, target = 4.5): string {
  const base = parseHex(accentHex);
  const bg = parseHex(backgroundHex);
  if (!base || !bg) return accentHex;
  if (contrastRatio(accentHex, backgroundHex) >= target) return accentHex;

  const bgL = luminance(bg.r, bg.g, bg.b);
  let { r, g, b } = base;
  for (let i = 0; i < 24; i++) {
    const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    if (contrastRatio(hex, backgroundHex) >= target) return hex;
    if (bgL > 0.5) {
      r = Math.max(0, r - 12);
      g = Math.max(0, g - 12);
      b = Math.max(0, b - 12);
    } else {
      r = Math.min(255, r + 12);
      g = Math.min(255, g + 12);
      b = Math.min(255, b + 12);
    }
  }
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
