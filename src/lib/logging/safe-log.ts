const REDACT_KEYS = /token|secret|password|authorization|api[_-]?key|participant/i;

export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 8 && /^[A-Za-z0-9._-]+$/.test(value)) {
      return "[redacted:string]";
    }
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.test(k) ? "[redacted]" : redactForLog(v);
    }
    return out;
  }
  return value;
}

export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 500);
  return "unknown error";
}
