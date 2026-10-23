import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ReleaseSchema, releaseTerms, type ReleaseConfig } from "@/lib/consent/release";

const noStore = { "Cache-Control": "no-store" };
function config(): ReleaseConfig {
  const organizer = process.env.CONSENT_ORGANIZER ?? "";
  const contact = process.env.CONSENT_CONTACT ?? "";
  const retention = process.env.CONSENT_RETENTION ?? "";
  return { organizer, contact, retention, ready: Boolean(organizer && z.string().email().safeParse(contact).success && retention && (process.env.CONSENT_OPERATOR_TOKEN?.length ?? 0) >= 32 && path.isAbsolute(process.env.CONSENT_STORAGE_DIR ?? "")), mailReady: Boolean(process.env.RESEND_API_KEY && process.env.CONSENT_MAIL_FROM) };
}
export async function GET() { return Response.json(config(), { headers: noStore }); }

const BodySchema = z.object({ record: ReleaseSchema, pdf: z.string().min(100).max(2800000).regex(/^[A-Za-z0-9+/=]+$/) });
export async function POST(request: Request) {
  const respond = (body: object, status = 200) => Response.json(body, { status, headers: noStore });
  const settings = config();
  if (!settings.ready) return respond({ error: "CONFIG_REQUIRED" }, 503);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return respond({ error: "FORBIDDEN" }, 403);
  const expected = createHash("sha256").update(process.env.CONSENT_OPERATOR_TOKEN!).digest();
  const supplied = createHash("sha256").update(request.headers.get("x-consent-operator") ?? "").digest();
  if (!timingSafeEqual(expected, supplied)) return respond({ error: "OPERATOR_AUTH_REQUIRED" }, 401);
  try {
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (!request.body) return respond({ error: "INVALID_BODY" }, 400);
    const reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 3200000) { await reader.cancel(); return respond({ error: "TOO_LARGE" }, 413); }
      chunks.push(value);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return respond({ error: "INVALID_BODY" }, 400); }
    const parsed = BodySchema.safeParse(input);
    if (!parsed.success) return respond({ error: "INVALID_BODY" }, 400);
    const { record, pdf } = parsed.data;
    if (record.terms !== releaseTerms(record.exposure, record.language, settings, record.photo)) return respond({ error: "TERMS_CHANGED" }, 409);
    const bytes = Buffer.from(pdf, "base64");
    if (bytes.subarray(0, 8).toString() !== "%PDF-1.4" || !bytes.subarray(-20).toString().includes("%%EOF")) return respond({ error: "INVALID_PDF" }, 400);
    const directory = process.env.CONSENT_STORAGE_DIR!;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const filename = path.join(directory, `${record.id}.json`);
    const digest = createHash("sha256").update(JSON.stringify({ record, pdf })).digest("hex");
    const stored = { record, pdf, digest, receivedAt: new Date().toISOString() };
    try { await writeFile(filename, JSON.stringify(stored), { flag: "wx", mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = JSON.parse(await readFile(filename, "utf8")) as typeof stored;
      if (existing.digest !== digest) return respond({ error: "IMMUTABLE_RECORD" }, 409);
    }
    const sentFile = path.join(directory, `${record.id}.sent.json`);
    try {
      const sent = JSON.parse(await readFile(sentFile, "utf8")) as { providerId: string };
      return respond({ saved: true, mail: "accepted", providerId: sent.providerId });
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (!record.email) return respond({ saved: true, mail: "pending", reason: "NO_EMAIL_REQUESTED" });
    if (!settings.mailReady) return respond({ saved: true, mail: "pending", reason: "MAIL_NOT_CONFIGURED" });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `release/${record.id}` },
      body: JSON.stringify({ from: process.env.CONSENT_MAIL_FROM, to: [record.email], reply_to: settings.contact,
        subject: record.purpose === "photography" ? (record.language === "en" ? "Your photography permission receipt" : "写真撮影・作品利用の同意内容の控え") : (record.language === "en" ? "Your interview consent receipt" : "インタビュー同意内容の控え"),
        text: `${record.language === "en" ? "Thank you. Your consent receipt is attached." : "ご協力ありがとうございました。同意内容の控えPDFを添付します。"}\n${record.videoId}\n\n${record.terms}`,
        attachments: [{ filename: `consent-${record.id}.pdf`, content: pdf }],
      }),
    });
    if (!response.ok) return respond({ saved: true, mail: "pending", reason: "MAIL_FAILED" });
    const result = await response.json() as { id?: string };
    if (!result.id) return respond({ saved: true, mail: "pending", reason: "MAIL_FAILED" });
    await writeFile(sentFile, JSON.stringify({ providerId: result.id, acceptedAt: new Date().toISOString() }), { mode: 0o600 });
    return respond({ saved: true, mail: "accepted", providerId: result.id });
  } catch { return respond({ error: "SAVE_OR_SEND_FAILED" }, 500); }
}
