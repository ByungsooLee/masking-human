/** Elapsed ms from session recording start (performance.now baseline). */
export class SessionClock {
  private origin: number | null = null;

  start(): void {
    this.origin = performance.now();
  }

  reset(): void {
    this.origin = null;
  }

  isRunning(): boolean {
    return this.origin !== null;
  }

  elapsedMs(): number {
    if (this.origin === null) return 0;
    return Math.round(performance.now() - this.origin);
  }
}

export function createSessionClock(): SessionClock {
  return new SessionClock();
}
