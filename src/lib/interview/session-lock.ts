const globalLocks = globalThis as unknown as {
  interviewSessionChains?: Map<string, Promise<unknown>>;
};

function chains(): Map<string, Promise<unknown>> {
  if (!globalLocks.interviewSessionChains) {
    globalLocks.interviewSessionChains = new Map();
  }
  return globalLocks.interviewSessionChains;
}

/** Serialize mutations per session id (in-memory single process). */
export async function withSessionLock<T>(
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const map = chains();
  const prev = map.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = prev.then(() => gate);
  map.set(sessionId, chain);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (map.get(sessionId) === chain) {
      map.delete(sessionId);
    }
  }
}
