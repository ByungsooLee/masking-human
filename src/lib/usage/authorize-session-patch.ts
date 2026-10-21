import { getSessionRecord } from "./session-usage-store";

export function authorizeSessionPatch(req: Request, sessionId: string): boolean {
  const token = req.headers.get("x-usage-patch-token")?.trim();
  if (!token) return false;
  const record = getSessionRecord(sessionId);
  return record?.patchToken === token;
}
