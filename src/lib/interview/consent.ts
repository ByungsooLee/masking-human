export const CONSENT_TYPES = [
  "ai_conversation",
  "recording",
  "photo_video",
  "sns_publish",
  "commercial",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface ConsentRecord {
  granted: boolean;
  recordedAt: string;
  revokedAt?: string;
  source: "participant" | "admin";
}

export type SessionConsents = Partial<Record<ConsentType, ConsentRecord>>;

export function grantConsent(
  consents: SessionConsents,
  type: ConsentType,
  source: "participant" | "admin" = "participant",
): SessionConsents {
  return {
    ...consents,
    [type]: { granted: true, recordedAt: new Date().toISOString(), source },
  };
}

export function revokeConsent(consents: SessionConsents, type: ConsentType): SessionConsents {
  const prev = consents[type];
  if (!prev) return consents;
  return {
    ...consents,
    [type]: { ...prev, granted: false, revokedAt: new Date().toISOString() },
  };
}

export function hasActiveConsent(consents: SessionConsents, type: ConsentType): boolean {
  const c = consents[type];
  return Boolean(c?.granted && !c.revokedAt);
}

export function allConsentsRevoked(consents: SessionConsents): boolean {
  return CONSENT_TYPES.every((t) => !hasActiveConsent(consents, t));
}
