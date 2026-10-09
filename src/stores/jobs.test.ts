import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedRun } from "@/lib/api/seed-audio";
import { RequestCancelled } from "@/lib/api/http";
import type { GenerateRequest } from "@/lib/seed-audio/schemas";

const generateAudio = vi.fn();
const buildHistoryEntry = vi.fn();
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

vi.mock("@/lib/api/seed-audio", () => ({ generateAudio: (...args: unknown[]) => generateAudio(...args) }));
vi.mock("@/lib/history-persist", () => ({ buildHistoryEntry: (...args: unknown[]) => buildHistoryEntry(...args) }));
vi.mock("sonner", () => ({ toast }));

const { useJobsStore, registerJobNavigator } = await import("./jobs");
const { useHistoryStore } = await import("./history");

const request: GenerateRequest = { mode: "text-to-audio", prompt: "Hello", config: {} };

const run = (): GeneratedRun => ({
  id: "r1",
  model: "ep",
  created: 1,
  outputFormat: "wav",
  usage: null,
  raw: {},
  tracks: [{ url: "/api/audio?src=x", blob: new Blob(["audio"]) }],
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const jobs = () => useJobsStore.getState().jobs;

beforeEach(() => {
  useJobsStore.setState({ jobs: [] });
  useHistoryStore.setState({ entries: [] });
  generateAudio.mockReset();
  buildHistoryEntry.mockReset();
  Object.values(toast).forEach((fn) => fn.mockReset());
  buildHistoryEntry.mockImplementation(async (_request, title: string) => ({ id: crypto.randomUUID(), createdAt: 1, mode: "text-to-audio", title, prompt: "Hello", config: {}, tracks: [], usage: null }));
  registerJobNavigator(null);
});

describe("jobs store", () => {
  it("runs every take as its own job, in order, and saves each to history", async () => {
    generateAudio.mockImplementation(async () => run());
    const ids = useJobsStore.getState().submit({ request, title: "Text to Audio", takes: 2 });
    expect(ids).toHaveLength(2);
    expect(jobs().map((job) => [job.take, job.takes, job.status])).toEqual([[1, 2, "running"], [2, 2, "running"]]);
    await settle();
    expect(jobs().every((job) => job.status === "succeeded")).toBe(true);
    expect(jobs()[0].result?.urls).toHaveLength(1);
    expect(useHistoryStore.getState().entries).toHaveLength(2);
    expect(toast.success).toHaveBeenCalledTimes(2);
    expect(jobs()[0].result?.run.id).toBe("r1");
  });

  it("marks a failing job as failed with a readable message and toasts it", async () => {
    generateAudio.mockRejectedValue(new Error("boom"));
    useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    expect(jobs()[0]).toMatchObject({ status: "failed", error: "boom" });
    expect(toast.error).toHaveBeenCalledWith("boom");
  });

  it("keeps a successful result even if saving to history fails", async () => {
    generateAudio.mockImplementation(async () => run());
    buildHistoryEntry.mockRejectedValue(new Error("quota"));
    useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    expect(jobs()[0].status).toBe("succeeded");
    expect(jobs()[0].result?.savedToHistory).toBe(false);
    expect(toast.warning).toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });

  it("cancels a running job without reporting an error", async () => {
    generateAudio.mockImplementation(
      (_request: unknown, signal: AbortSignal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new RequestCancelled()))),
    );
    const [id] = useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    useJobsStore.getState().cancel(id);
    await settle();
    expect(jobs()[0].status).toBe("cancelled");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("retries a failed job as a fresh job and removes the old one", async () => {
    generateAudio.mockRejectedValueOnce(new Error("boom")).mockImplementation(async () => run());
    const [id] = useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    useJobsStore.getState().retry(id);
    expect(jobs()).toHaveLength(1);
    expect(jobs()[0].id).not.toBe(id);
    await settle();
    expect(jobs()[0].status).toBe("succeeded");
  });

  it("refuses to retry or dismiss a job that is still running", () => {
    generateAudio.mockImplementation(() => new Promise(() => undefined));
    const [id] = useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    useJobsStore.getState().retry(id);
    useJobsStore.getState().dismiss(id);
    expect(jobs()).toHaveLength(1);
    expect(jobs()[0].id).toBe(id);
  });

  it("revokes object URLs when a finished job is dismissed", async () => {
    generateAudio.mockImplementation(async () => run());
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const [id] = useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    useJobsStore.getState().dismiss(id);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(jobs()).toHaveLength(0);
    revoke.mockRestore();
  });

  it("clears only finished jobs for the requested mode", async () => {
    generateAudio.mockImplementation(async () => run());
    useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    generateAudio.mockImplementation(() => new Promise(() => undefined));
    useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    useJobsStore.getState().dismissFinished("text-to-audio");
    expect(jobs().map((job) => job.status)).toEqual(["running"]);
  });

  it("offers a View action that navigates to the mode's studio", async () => {
    generateAudio.mockImplementation(async () => run());
    const navigate = vi.fn();
    registerJobNavigator(navigate);
    useJobsStore.getState().submit({ request, title: "t", takes: 1 });
    await settle();
    const options = toast.success.mock.calls[0][1] as { action: { onClick: () => void } };
    options.action.onClick();
    expect(navigate).toHaveBeenCalledWith("/studio/text-to-audio");
  });
});
