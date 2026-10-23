/** Set at build time for a dedicated, API-free preview deployment. */
export function isDemoOnly(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_ONLY === "1";
}
