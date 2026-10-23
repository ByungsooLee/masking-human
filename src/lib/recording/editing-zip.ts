import type { EditingFile } from "./editing-files";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
async function checksum(blob: Blob): Promise<number> {
  const reader = blob.stream().getReader();
  let crc = 0xffffffff;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    for (const byte of value) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function header(size: number) { const bytes = new Uint8Array(size); return { bytes, view: new DataView(bytes.buffer) }; }

export async function buildEditingZip(files: EditingFile[]): Promise<Blob> {
  if (files.length > 65535) throw new Error("ZIP64 required");
  const parts: BlobPart[] = [];
  const directory: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const file of files) {
    if (file.blob.size > 0xffffffff || offset + file.blob.size > 0xffffff00) throw new Error("ZIP64 required; download separately");
    const name = new TextEncoder().encode(file.name);
    const crc = await checksum(file.blob);
    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true); local.view.setUint16(12, 0x21, true);
    local.view.setUint32(14, crc, true); local.view.setUint32(18, file.blob.size, true); local.view.setUint32(22, file.blob.size, true); local.view.setUint16(26, name.length, true);
    parts.push(local.bytes, name, file.blob);
    const central = header(46);
    central.view.setUint32(0, 0x02014b50, true); central.view.setUint16(4, 20, true); central.view.setUint16(6, 20, true); central.view.setUint16(8, 0x800, true); central.view.setUint16(14, 0x21, true);
    central.view.setUint32(16, crc, true); central.view.setUint32(20, file.blob.size, true); central.view.setUint32(24, file.blob.size, true); central.view.setUint16(28, name.length, true); central.view.setUint32(42, offset, true);
    directory.push(central.bytes, name);
    offset += 30 + name.length + file.blob.size;
  }
  const directorySize = directory.reduce((sum, bytes) => sum + bytes.length, 0);
  if (offset + directorySize > 0xffffffff) throw new Error("ZIP64 required");
  parts.push(...directory);
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, files.length, true); end.view.setUint16(10, files.length, true); end.view.setUint32(12, directorySize, true); end.view.setUint32(16, offset, true);
  parts.push(end.bytes);
  return new Blob(parts, { type: "application/zip" });
}
