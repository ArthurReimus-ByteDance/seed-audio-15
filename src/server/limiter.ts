import "server-only";

export type Limiter = {
  run<T>(task: () => Promise<T>): Promise<T>;
  stats(): { inFlight: number; queued: number; limit: number };
};

export function createLimiter(limit: number): Limiter {
  let inFlight = 0;
  const waiting: Array<() => void> = [];

  const acquire = () =>
    new Promise<void>((resolve) => {
      if (inFlight < limit) {
        inFlight += 1;
        resolve();
        return;
      }
      waiting.push(() => {
        inFlight += 1;
        resolve();
      });
    });

  const release = () => {
    inFlight -= 1;
    waiting.shift()?.();
  };

  return {
    async run(task) {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
    stats: () => ({ inFlight, queued: waiting.length, limit }),
  };
}

const globalForLimiter = globalThis as unknown as { __seedAudioLimiter?: Limiter };

export function getLimiter(limit: number): Limiter {
  if (!globalForLimiter.__seedAudioLimiter || globalForLimiter.__seedAudioLimiter.stats().limit !== limit) {
    globalForLimiter.__seedAudioLimiter = createLimiter(limit);
  }
  return globalForLimiter.__seedAudioLimiter;
}
