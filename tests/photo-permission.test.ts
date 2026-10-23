import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SIMPLE_PHOTO_USES, PhotoPermissionSchema, type PhotoPermission } from "@/lib/consent/photo-permission";
import { releaseTerms, ReleaseSchema, RELEASE_VERSION } from "@/lib/consent/release";
import { jpegPagesPdf } from "@/lib/consent/receipt-pdf";

const photo: PhotoPermission = { project: "Street portrait", date: "2026-10-22", location: "Tokyo", files: "SHOOT-001 / IMG_001-005", uses: ["sns", "exhibition"], period: "Until 2027-10-22", compensation: "Unpaid, by agreement", credit: "anonymous", displayName: "", captureConfirmed: true };
const config = { organizer: "Photographer", contact: "contact@example.com", retention: "1 year" };
const base = { id: "c29685d0-7e7a-41c2-a242-d0141278a2f4", videoId: "1fe7754d-a262-4691-8342-3e5a3af2783c", purpose: "photography", photo, version: RELEASE_VERSION, language: "en", exposure: "A", name: "Guest", email: "guest@example.com", age: "adult", guardian: "", agreed: true, ageConfirmed: true, monetizationConfirmed: true, withdrawalConfirmed: true, signedAt: "2026-10-22T00:00:00Z", terms: releaseTerms("A", "en", config, photo), signature: "data:image/png;base64,aW5r" };

describe("separate photography permission", () => {
  it("requires shoot details, purposes and explicit permission without default grants", () => {
    expect(PhotoPermissionSchema.safeParse(photo).success).toBe(true);
    for (const change of [{ uses: [] }, { captureConfirmed: false }, { compensation: "" }, { files: "" }, { period: "" }, { credit: "named", displayName: "" }, { date: "2026-02-30" }]) expect(PhotoPermissionSchema.safeParse({ ...photo, ...change }).success).toBe(false);
  });
  it("lists only selected uses, separates commercial permission and excludes interview rights", () => {
    const terms = releaseTerms("A", "en", config, photo);
    expect(terms).toContain("Permitted uses ONLY: Instagram / social media, Art exhibitions");
    expect(terms).toContain("does not permit interview audio or video");
    expect(terms).toContain("Unpaid, by agreement");
    expect(terms).toContain("No blanket waiver");
    expect(terms).not.toContain("Permitted uses ONLY: Paid advertising");
    expect(releaseTerms("C", "ja", config, photo)).toContain("後ろ姿・手元のみ");
    expect(releaseTerms("C", "ja", config, photo)).not.toContain("音声の使用を許可");
  });
  it("requires photo payload for photography and disallows voice-only or mixed interview records", () => {
    expect(ReleaseSchema.safeParse(base).success).toBe(true);
    expect(ReleaseSchema.safeParse({ ...base, photo: undefined }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...base, exposure: "B" }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...base, purpose: "interview" }).success).toBe(false);
  });
  it("uses a separate page, navigation entry, browser archive and Suspense boundary", () => {
    expect(readFileSync("src/components/primary-navigation.tsx", "utf8")).toContain('href: "/photo-consent"');
    expect(readFileSync("src/app/photo-consent/page.tsx", "utf8")).toContain("<Suspense");
    const source = readFileSync("src/components/live/photo-consent-page.tsx", "utf8");
    expect(source).toContain("<PhotoSignaturePad");
    expect(source).not.toContain("<ReleaseConsent");
    expect(source).not.toContain("Confirm signature");
    expect(source).toContain('type="submit"');
    expect(source).toContain('required checked={agreed}');
    expect(source).not.toContain("setReleaseConsent");
    expect(readFileSync("src/lib/consent/photo-archive.ts", "utf8")).toContain("masking-human-photo-permissions");
  });
  it("can create multiple PDF pages for long permission text", () => {
    const page = { jpeg: new Uint8Array([255, 216, 255, 217]), width: 1240, height: 1754 };
    const source = Buffer.from(jpegPagesPdf([page, page])).toString("latin1");
    expect(source).toContain("/Count 2");
    expect(source).toContain("/Kids [3 0 R 6 0 R]");
    const offset = Number(source.match(/startxref\n(\d+)/)![1]);
    expect(source.slice(offset, offset + 4)).toBe("xref");
  });
  it("simplifies permission to one adult session without expanding to advertising or AI", () => {
    const simple: PhotoPermission = { ...photo, format: "simple-v1", uses: [...SIMPLE_PHOTO_USES] };
    expect(PhotoPermissionSchema.safeParse(simple).success).toBe(true);
    expect(PhotoPermissionSchema.safeParse({ ...simple, uses: [...simple.uses, "advertising"] }).success).toBe(false);
    const terms = releaseTerms("C", "en", config, simple);
    expect(terms).toContain("photographs together as artwork");
    expect(terms).toContain("I cannot be identified");
    expect(terms).toContain("No corporate advertising");
    expect(terms).toContain("optional email");
    const record = { ...base, photo: simple, email: "", terms };
    expect(ReleaseSchema.safeParse(record).success).toBe(true);
    expect(ReleaseSchema.safeParse({ ...record, age: "guardian", guardian: "Parent" }).success).toBe(false);
    expect(ReleaseSchema.safeParse({ ...record, purpose: "interview", photo: undefined }).success).toBe(false);
  });
});
