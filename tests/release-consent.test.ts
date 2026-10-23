import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET, POST } from "@/app/api/release-consent/route";
import { RELEASE_VERSION, ReleaseSchema, releaseTerms, type ReleaseRecord } from "@/lib/consent/release";
import { jpegPdf } from "@/lib/consent/receipt-pdf";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import type { PhotoPermission } from "@/lib/consent/photo-permission";

const settings = { organizer: "Test organizer", contact: "contact@example.com", retention: "1 year" };
const token = "test-operator-token-at-least-32-characters";
const record: ReleaseRecord = {
  id: "c29685d0-7e7a-41c2-a242-d0141278a2f4", videoId: "1fe7754d-a262-4691-8342-3e5a3af2783c",
  version: RELEASE_VERSION, language: "ja", exposure: "B", name: "Test Guest", email: "guest@example.com", age: "adult", guardian: "", agreed: true, ageConfirmed: true, monetizationConfirmed: true, withdrawalConfirmed: true,
  signedAt: "2026-10-22T00:00:00.000Z", terms: releaseTerms("B", "ja", settings), signature: "data:image/png;base64,aW5r",
};
const pdf = Buffer.from(jpegPdf(new Uint8Array([255, 216, 255, 217]), 10, 10)).toString("base64");
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "consent-test-"));
  vi.stubEnv("CONSENT_ORGANIZER", settings.organizer); vi.stubEnv("CONSENT_CONTACT", settings.contact); vi.stubEnv("CONSENT_RETENTION", settings.retention);
  vi.stubEnv("CONSENT_STORAGE_DIR", directory); vi.stubEnv("CONSENT_OPERATOR_TOKEN", token);
  vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("CONSENT_MAIL_FROM", "");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network prohibited in tests")));
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.unstubAllGlobals(); useMagazineFlowStore.getState().resetFlow(); });
function request(body: unknown = { record, pdf }, secret = token, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/release-consent", { method: "POST", headers: { origin, "x-consent-operator": secret, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
describe("exposure consent", () => {
  it("does not declare a runtime segment option with Cache Components enabled", async () => {
    const source = await readFile("src/app/api/release-consent/route.ts", "utf8");
    expect(source).not.toMatch(/export\s+const\s+runtime\s*=/);
  });
  it("changes scope without promising automatic masking and keeps terms in both languages", () => {
    expect(releaseTerms("A", "ja", settings)).toContain("顔・声・全身");
    expect(record.terms).toContain("声のみ"); expect(record.terms).toContain("自動モザイク機能はありません");
    expect(releaseTerms("C", "ja", settings)).toContain("音声の使用を許可");
    expect(releaseTerms("C", "en", settings)).toContain("My voice may be used");
    expect(releaseTerms("C", "ja", settings)).not.toContain("声は削除");
    for (const language of ["ja", "en"] as const) for (const exposure of ["A", "B", "C"] as const) {
      const terms = releaseTerms(exposure, language, settings);
      expect(terms).toContain(settings.contact); expect(terms).toContain("YouTube"); expect(terms).toContain("Resend");
    }
    expect(ReleaseSchema.safeParse({ ...record, age: "guardian", guardian: "" }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...record, agreed: false }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...record, monetizationConfirmed: false }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...record, withdrawalConfirmed: false }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...record, version: "2026-10-22.1" }).success).toBe(false);
    expect(record.terms).toContain("法令上免除できない責任は除外");
  });
  it("builds a PDF with byte-correct object and cross-reference offsets", () => {
    const bytes = jpegPdf(new Uint8Array([255, 216, 0, 255, 217]), 10, 10);
    const source = Buffer.from(bytes).toString("latin1");
    expect(source.startsWith("%PDF-1.4")).toBe(true);
    const xref = Number(source.match(/startxref\n(\d+)/)![1]);
    expect(source.slice(xref, xref + 4)).toBe("xref");
    for (const [index, entry] of source.slice(xref).split("\n").slice(3, 8).entries()) expect(source.slice(Number(entry.slice(0, 10)))).toMatch(new RegExp(`^${index + 1} 0 obj`));
  });
  it("exposes no secret and rejects unauthenticated or cross-origin submissions", async () => {
    const configuration = await (await GET()).json();
    expect(configuration.ready).toBe(true); expect(JSON.stringify(configuration)).not.toContain(token);
    expect((await POST(request(undefined, "wrong"))).status).toBe(401);
    expect((await POST(request(undefined, token, "https://other.example"))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("saves an immutable snapshot and explicitly leaves email pending when unconfigured", async () => {
    const result = await (await POST(request())).json();
    expect(result).toMatchObject({ saved: true, mail: "pending", reason: "MAIL_NOT_CONFIGURED" });
    const stored = JSON.parse(await readFile(path.join(directory, `${record.id}.json`), "utf8"));
    expect(stored.record).toEqual(record); expect(stored.pdf).toBe(pdf); expect(stored.digest).toHaveLength(64); expect(stored.receivedAt).toBeTruthy();
    expect((await POST(request({ record: { ...record, name: "Changed" }, pdf }))).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects oversized requests and disables signing for incomplete configuration", async () => {
    expect((await POST(request({ text: "x".repeat(3200001) }))).status).toBe(413);
    vi.stubEnv("CONSENT_OPERATOR_TOKEN", "too-short");
    expect(await (await GET()).json()).toMatchObject({ ready: false });
    expect((await POST(request())).status).toBe(503);
  });
  it("stores photography separately in its signed payload and uses a photo-specific email subject", async () => {
    const photo: PhotoPermission = { project: "Portrait artwork", date: "2026-10-22", location: "Studio", files: "SHOOT-001", uses: ["sns"], period: "One year", compensation: "Unpaid", credit: "anonymous", displayName: "", captureConfirmed: true };
    const photoRecord = { ...record, purpose: "photography", photo, exposure: "C", terms: releaseTerms("C", "ja", settings, photo) };
    vi.stubEnv("RESEND_API_KEY", "test-not-real"); vi.stubEnv("CONSENT_MAIL_FROM", "receipts@example.com");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: "photo-provider" }));
    expect(await (await POST(request({ record: photoRecord, pdf }))).json()).toMatchObject({ saved: true, mail: "accepted" });
    const stored = JSON.parse(await readFile(path.join(directory, `${record.id}.json`), "utf8"));
    expect(stored.record.photo.uses).toEqual(["sns"]);
    expect(stored.record.purpose).toBe("photography");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).subject).toContain("写真撮影");
    expect((await POST(request({ record: { ...photoRecord, terms: record.terms }, pdf }))).status).toBe(409);
  });
  it("saves a photo permission without optional email and never calls the email service", async () => {
    const photo: PhotoPermission = { project: "Portrait artwork", date: "2026-10-22", location: "Studio", files: "SHOOT-002", uses: ["sns"], period: "One year", compensation: "Unpaid", credit: "anonymous", displayName: "", captureConfirmed: true };
    vi.stubEnv("RESEND_API_KEY", "test-not-real"); vi.stubEnv("CONSENT_MAIL_FROM", "receipts@example.com");
    const photoRecord = { ...record, purpose: "photography", photo, email: "", exposure: "A", terms: releaseTerms("A", "ja", settings, photo) };
    expect(await (await POST(request({ record: photoRecord, pdf }))).json()).toMatchObject({ saved: true, mail: "pending", reason: "NO_EMAIL_REQUESTED" });
    expect(fetch).not.toHaveBeenCalled();
    expect((await POST(request({ record: { ...record, email: "" }, pdf }))).status).toBe(400);
  });
  it("rejects changed terms, invalid email, blank guardian and invalid PDF", async () => {
    expect((await POST(request({ record: { ...record, terms: "different" }, pdf }))).status).toBe(409);
    for (const invalid of [{ email: "not-email" }, { age: "guardian", guardian: "" }]) expect((await POST(request({ record: { ...record, ...invalid }, pdf }))).status).toBe(400);
    expect((await POST(request({ record, pdf: Buffer.from("not a pdf".repeat(20)).toString("base64") }))).status).toBe(400);
  });
  it("reports provider rejection as pending and retries with the same idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-not-real"); vi.stubEnv("CONSENT_MAIL_FROM", "receipts@example.com");
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "rejected" }, { status: 429 })).mockResolvedValueOnce(Response.json({ id: "provider-one" }));
    expect(await (await POST(request())).json()).toMatchObject({ saved: true, mail: "pending" });
    expect(await (await POST(request())).json()).toMatchObject({ saved: true, mail: "accepted", providerId: "provider-one" });
    expect(await (await POST(request())).json()).toMatchObject({ mail: "accepted" });
    expect(fetch).toHaveBeenCalledTimes(2);
    const options = vi.mocked(fetch).mock.calls[1][1]!;
    expect(options.headers).toMatchObject({ "Idempotency-Key": `release/${record.id}` });
    expect(JSON.parse(options.body as string)).toMatchObject({ to: [record.email], attachments: [{ content: pdf }] });
  });
  it("keeps a signed video's ID when recording starts and never persists personal consent as defaults", () => {
    const release = { record, pdf, mail: "pending" as const };
    useMagazineFlowStore.getState().setReleaseConsent(release);
    useMagazineFlowStore.getState().markSessionStart();
    expect(useMagazineFlowStore.getState().archiveId).toBe(record.videoId);
    expect(useMagazineFlowStore.getState().releaseConsent).toEqual(release);
    useMagazineFlowStore.getState().resetFlow();
    expect(useMagazineFlowStore.getState().releaseConsent).toBeNull();
  });
});
