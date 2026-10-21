/** Cinema subtitle: ~16 chars per line, max 2 lines. */
export function wrapSubtitleLines(text: string, maxChars = 16, maxLines = 2): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines: string[] = [];
  let rest = trimmed;
  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      break;
    }
    let cut = maxChars;
    const slice = rest.slice(0, maxChars + 1);
    const breakJa = slice.lastIndexOf("、");
    const breakSpace = slice.lastIndexOf(" ");
    const br = Math.max(breakJa, breakSpace);
    if (br > 4) cut = br + (breakJa === br ? 1 : 0);
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return lines;
}
