import { toast } from "sonner";
import { create } from "zustand";
import { generateAudio, type GeneratedRun } from "@/lib/api/seed-audio";
import { getErrorMessage, RequestCancelled } from "@/lib/api/http";
import { buildHistoryEntry } from "@/lib/history-persist";
import { MODE_DEFINITIONS, type StudioMode } from "@/lib/seed-audio/modes";
import type { GenerateRequest } from "@/lib/seed-audio/schemas";
import { MODE_HREFS } from "@/components/layout/nav-items";
import { useHistoryStore } from "./history";

export const JOB_LIMIT = 40;

export type JobStatus = "running" | "succeeded" | "failed" | "cancelled";

export type JobResult = { entryId: string | null; createdAt: number; run: GeneratedRun; urls: string[]; savedToHistory: boolean };

export type Job = {
  id: string;
  groupId: string;
  take: number;
  takes: number;
  mode: StudioMode;
  title: string;
  request: GenerateRequest;
  status: JobStatus;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  result?: JobResult;
};

type SubmitInput = { request: GenerateRequest; title: string; takes: number };

type JobsState = {
  jobs: Job[];
  submit: (input: SubmitInput) => string[];
  cancel: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  dismissFinished: (mode: StudioMode) => void;
};

const controllers = new Map<string, AbortController>();
let navigate: ((href: string) => void) | null = null;

export function registerJobNavigator(handler: ((href: string) => void) | null) {
  navigate = handler;
}

const revokeUrls = (job: Job) => job.result?.urls.forEach((url) => URL.revokeObjectURL(url));

export const useJobsStore = create<JobsState>()((set, get) => {
  const patch = (id: string, change: Partial<Job>) =>
    set((state) => ({ jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...change } : job)) }));

  const trim = () => {
    const { jobs } = get();
    if (jobs.length <= JOB_LIMIT) return;
    const removable = jobs.filter((job) => job.status !== "running").slice(JOB_LIMIT - jobs.filter((job) => job.status === "running").length);
    removable.forEach(revokeUrls);
    set({ jobs: jobs.filter((job) => !removable.includes(job)) });
  };

  const execute = async (job: Job) => {
    const controller = new AbortController();
    controllers.set(job.id, controller);
    const label = job.takes > 1 ? `Take ${job.take}/${job.takes}` : undefined;
    try {
      const run = await generateAudio(job.request, controller.signal);
      const urls = run.tracks.map((track) => URL.createObjectURL(track.blob));
      let entryId: string | null = null;
      let createdAt = Date.now();
      let savedToHistory = true;
      try {
        const entry = await buildHistoryEntry(job.request, job.title, run, label);
        useHistoryStore.getState().addEntry(entry);
        entryId = entry.id;
        createdAt = entry.createdAt;
      } catch {
        savedToHistory = false;
        toast.warning("Generated, but the audio could not be saved to history (browser storage may be full).");
      }
      patch(job.id, { status: "succeeded", finishedAt: Date.now(), result: { entryId, createdAt, run, urls, savedToHistory } });
      toast.success(`${MODE_DEFINITIONS[job.mode].title}${label ? ` (${label})` : ""} is ready`, {
        action: navigate ? { label: "View", onClick: () => navigate?.(MODE_HREFS[job.mode]) } : undefined,
      });
    } catch (error) {
      if (error instanceof RequestCancelled) {
        patch(job.id, { status: "cancelled", finishedAt: Date.now() });
      } else {
        const message = getErrorMessage(error);
        patch(job.id, { status: "failed", finishedAt: Date.now(), error: message });
        toast.error(message);
      }
    } finally {
      controllers.delete(job.id);
    }
  };

  return {
    jobs: [],
    submit: ({ request, title, takes }) => {
      const groupId = crypto.randomUUID();
      const created: Job[] = Array.from({ length: takes }, (_, index) => ({
        id: crypto.randomUUID(),
        groupId,
        take: index + 1,
        takes,
        mode: request.mode,
        title,
        request,
        status: "running",
        startedAt: Date.now(),
      }));
      set((state) => ({ jobs: [...created, ...state.jobs] }));
      trim();
      created.forEach((job) => void execute(job));
      return created.map((job) => job.id);
    },
    cancel: (id) => controllers.get(id)?.abort(),
    retry: (id) => {
      const job = get().jobs.find((candidate) => candidate.id === id);
      if (!job || job.status === "running") return;
      get().dismiss(id);
      get().submit({ request: job.request, title: job.title, takes: 1 });
    },
    dismiss: (id) => {
      const job = get().jobs.find((candidate) => candidate.id === id);
      if (!job || job.status === "running") return;
      revokeUrls(job);
      set((state) => ({ jobs: state.jobs.filter((candidate) => candidate.id !== id) }));
    },
    dismissFinished: (mode) => {
      const finished = get().jobs.filter((job) => job.mode === mode && job.status !== "running");
      finished.forEach(revokeUrls);
      set((state) => ({ jobs: state.jobs.filter((job) => !finished.includes(job)) }));
    },
  };
});

export const selectRunningCount = (state: JobsState) => state.jobs.filter((job) => job.status === "running").length;
