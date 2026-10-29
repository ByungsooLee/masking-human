import type { ArchivedSession } from "./session-archive";
import type { SignedRelease } from "@/lib/consent/release";

export function signedReleases(session: ArchivedSession) {
  return [...new Map([...(session.releaseHistory ?? []), ...(session.releaseConsent ? [session.releaseConsent] : [])]
    .map((release) => [release.record.id, release])).values()];
}

export function requireInterviewRelease(session: ArchivedSession, release = session.releaseConsent) {
  if (!release?.pdf || !release.record.signature || !release.record.signedAt || release.record.videoId !== session.id || release.record.purpose === "photography") {
    throw new Error("A matching saved interview signature is required");
  }
  return release;
}

export function withArchivedRelease(session: ArchivedSession, release: SignedRelease): ArchivedSession {
  requireInterviewRelease(session, release);
  const history = new Map(signedReleases(session).map((item) => [item.record.id, item]));
  history.set(release.record.id, release);
  return { ...session, releaseConsent: release, releaseHistory: [...history.values()] };
}

export function withParticipantReport(session: ArchivedSession, report: NonNullable<ArchivedSession["participantReports"]>[number]): ArchivedSession {
  if (report.releaseId !== session.releaseConsent?.record.id) throw new Error("Signature changed during report creation");
  if (!signedReleases(session).some((release) => release.record.id === report.releaseId && requireInterviewRelease(session, release))) {
    throw new Error("Signature record missing");
  }
  return { ...session, participantReports: [...(session.participantReports ?? []), report] };
}

export function reportSource(session: ArchivedSession) {
  return JSON.stringify([session.transcript.filter((row) => !row.excluded).map((row) => [row.id, row.speaker, row.text]), session.analysisFeedback ?? {}, session.releaseConsent?.record.id]);
}
