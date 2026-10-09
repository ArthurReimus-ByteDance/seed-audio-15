import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("createLimiter", () => {
  it("never runs more tasks than the limit and queues the rest in order", async () => {
    const limiter = createLimiter(2);
    const gates = [deferred(), deferred(), deferred()];
    const started: number[] = [];
    const tasks = gates.map((gate, index) =>
      limiter.run(async () => {
        started.push(index);
        await gate.promise;
        return index;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    expect(limiter.stats()).toMatchObject({ inFlight: 2, queued: 1 });
    gates[0].resolve();
    await tasks[0];
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);
    gates[1].resolve();
    gates[2].resolve();
    expect(await Promise.all(tasks)).toEqual([0, 1, 2]);
    expect(limiter.stats()).toMatchObject({ inFlight: 0, queued: 0 });
  });

  it("releases the slot when a task throws", async () => {
    const limiter = createLimiter(1);
    await expect(limiter.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await limiter.run(async () => "ok")).toBe("ok");
    expect(limiter.stats().inFlight).toBe(0);
  });
});
