import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const OPERATOR_COOKIE = "interview_operator";

const testSecret = randomBytes(32).toString("hex");
let passwordCache: { password: string; secret: string; hash: Buffer } | undefined;

function sessionSecret() {
  const configured = process.env.INTERVIEW_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new Error("PIPELINE_CONFIGURATION");
  if (process.env.NODE_ENV === "test") return testSecret;
  const directory = path.join(process.cwd(), "private-usage");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "session-secret");
  try { writeFileSync(filename, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const secret = readFileSync(filename, "utf8");
  if (secret.length < 32) throw new Error("PIPELINE_CONFIGURATION");
  return secret;
}

function digest(value: string) {
  return createHmac("sha256", sessionSecret()).update(`${process.env.INTERVIEW_OPERATOR_PASSWORD ?? "disabled"}\0${value}`).digest("hex");
}

export function validOperatorPassword(value: string) {
  const password = process.env.INTERVIEW_OPERATOR_PASSWORD;
  if (!password || password.length < 8 || value.length > 2048) return false;
  const secret = sessionSecret();
  if (passwordCache?.password !== password || passwordCache.secret !== secret) passwordCache = { password, secret, hash: scryptSync(password, secret, 32) };
  return timingSafeEqual(scryptSync(value, secret, 32), passwordCache.hash);
}

export function operatorCookieValue(now = Date.now()) {
  const expires = now + 8 * 60 * 60 * 1000;
  return `${expires}.${digest(String(expires))}`;
}

export function operatorAuthorized(request: Request, now = Date.now()) {
  if ((process.env.INTERVIEW_OPERATOR_PASSWORD?.length ?? 0) < 8) return false;
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${OPERATOR_COOKIE}=`))?.slice(OPERATOR_COOKIE.length + 1);
  const [expires, signature] = value?.split(".") ?? [];
  try {
    return Boolean(expires && signature && Number(expires) > now && Number(expires) <= now + 8 * 60 * 60 * 1000 && /^[a-f0-9]{64}$/u.test(signature) && timingSafeEqual(Buffer.from(signature), Buffer.from(digest(expires))));
  } catch { return false; }
}

export function publicOrigin(request: Request) {
  if (process.env.INTERVIEW_APP_ORIGIN) return new URL(process.env.INTERVIEW_APP_ORIGIN).origin;
  const url = new URL(request.url);
  return new URL(`${url.protocol}//${request.headers.get("host") ?? url.host}`).origin;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === publicOrigin(request);
  } catch { return false; }
}
