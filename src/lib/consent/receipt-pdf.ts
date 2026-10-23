import type { ReleaseRecord } from "./release";

type JpegPage = { jpeg: Uint8Array; width: number; height: number };

export function jpegPdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  return jpegPagesPdf([{ jpeg, width, height }]);
}

export function jpegPagesPdf(pages: JpegPage[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets = [0];
  const append = (value: string | Uint8Array) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, value: string) => { offsets[id] = length; append(`${id} 0 obj\n${value}\nendobj\n`); };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 3} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach(({ jpeg, width, height }, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    offsets[imageId] = length;
    append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    append(jpeg); append("\nendstream\nendobj\n");
    const content = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    object(contentId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
  });
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const result = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length; }
  return result;
}

export async function createReceiptPdf(record: ReleaseRecord): Promise<string> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const pages: JpegPage[] = [];
  let top = 62;
  const reset = () => { context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#2A2A28"; context.font = "22px sans-serif"; top = 62; };
  const capture = () => { pages.push({ jpeg: Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]), (character) => character.charCodeAt(0)), width: canvas.width, height: canvas.height }); };
  reset();
  const title = record.purpose === "photography" ? (record.language === "en" ? "Photography permission receipt" : "写真撮影・作品利用同意書・控え") : (record.language === "en" ? "Interview consent receipt" : "インタビュー掲載同意書・控え");
  const text = `${title}\nVersion: ${record.version}\nConsent ID: ${record.id}\nShoot ID: ${record.videoId}\nSigned: ${record.signedAt}\n${record.name} / ${record.email}\nExposure: ${record.exposure} / ${record.age}${record.guardian ? ` / ${record.guardian}` : ""}\n\n${record.terms}`;
  const line = (value: string) => { if (top > 1600) { capture(); reset(); } context.fillText(value, 62, top); top += 32; };
  for (const paragraph of text.split("\n")) {
    let wrapped = "";
    for (const character of paragraph) {
      if (context.measureText(wrapped + character).width > 1116) { line(wrapped); wrapped = ""; }
      wrapped += character;
    }
    line(wrapped);
  }
  if (top > 1450) { capture(); reset(); }
  const image = new Image();
  image.src = record.signature;
  await image.decode();
  context.drawImage(image, 62, top + 16, 500, 150);
  capture();
  const pdf = jpegPagesPdf(pages);
  let binary = "";
  for (const byte of pdf) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function downloadReceipt(pdf: string, id: string) {
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${pdf}`;
  link.download = `consent-${id}.pdf`;
  link.click();
}
