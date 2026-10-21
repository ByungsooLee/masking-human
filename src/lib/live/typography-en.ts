/** Curly quotes for English interview copy on stage. */
export function formatEnglishQuote(text: string): string {
  let out = text.replace(/'/g, "’");
  if (!out.startsWith("“")) out = `“${out}`;
  if (!out.endsWith("”")) out = `${out}”`;
  return out;
}
