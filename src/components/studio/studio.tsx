"use client";

import { ChevronDown, ChevronUp, CircleAlert, Sparkles, Terminal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MODE_ICONS } from "@/components/layout/nav-items";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftsHydrated } from "@/hooks/use-hydrated";
import { useServiceStatus } from "@/hooks/use-service-status";
import { appendBlock, composeSpeakerLine, insertSnippet, setConstraintHeader } from "@/lib/prompt/compose";
import { estimateSpeech } from "@/lib/prompt/lint";
import { MAX_REFERENCE_AUDIOS } from "@/lib/seed-audio/constants";
import { MODE_DEFINITIONS, type StudioMode } from "@/lib/seed-audio/modes";
import type { AudioConfig } from "@/lib/seed-audio/schemas";
import { useDraftStore } from "@/stores/draft";
import { selectRunningCount, useJobsStore, type Job } from "@/stores/jobs";
import { usePreferencesStore } from "@/stores/preferences";
import { EMPTY_DRAFT, useStudioDraftsStore } from "@/stores/studio-drafts";
import { AudioSettings } from "./audio-settings";
import { PromptEditor } from "./prompt-editor";
import { PromptInsights } from "./prompt-insights";
import { PromptPicker } from "./prompt-picker";
import { PromptToolkit } from "./prompt-toolkit";
import { ReferenceAudioField } from "./reference-audio-field";
import { MuxOption } from "./mux-option";
import { ReferenceImageField } from "./reference-image-field";
import { RequestPreview } from "./request-preview";
import { EmptyResults, JobCard } from "./run-results";
import { SavePromptDialog } from "./save-prompt-dialog";
import { clipLimits, EMPTY_FORM, validateStudioForm, visibleErrors, type StudioFormState } from "./studio-state";
import { TimelineBuilder } from "./timeline-builder";
import { TranslationFields } from "./translation-fields";
import { VideoSourceField } from "./video-source-field";

const MAX_TAKES = 4;
const TIMELINE_MODES: StudioMode[] = ["text-to-audio", "reference-voice", "video-to-audio"];

function StudioSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-14 w-72" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function Studio({ mode }: { mode: StudioMode }) {
  const hydrated = useDraftsHydrated();
  return hydrated ? <StudioWorkspace key={mode} mode={mode} /> : <StudioSkeleton />;
}

function initialForm(mode: StudioMode): StudioFormState {
  const saved = useStudioDraftsStore.getState().drafts[mode] ?? EMPTY_DRAFT;
  const handoff = useDraftStore.getState().draft;
  return {
    ...EMPTY_FORM,
    prompt: handoff?.mode === mode ? handoff.prompt : saved.prompt,
    videoSource: saved.videoSource,
    targetLanguage: saved.targetLanguage,
    glossaries: saved.glossaries,
    muxVideo: saved.muxVideo ?? false,
    takes: saved.takes,
  };
}

function StudioWorkspace({ mode }: { mode: StudioMode }) {
  const definition = MODE_DEFINITIONS[mode];
  const Icon = MODE_ICONS[mode];
  const status = useServiceStatus();
  const config = usePreferencesStore((state) => state.config);
  const setConfig = usePreferencesStore((state) => state.setConfig);
  const consumeDraft = useDraftStore((state) => state.consumeDraft);
  const saveDraft = useStudioDraftsStore((state) => state.save);
  const allJobs = useJobsStore((state) => state.jobs);
  const runningCount = useJobsStore(selectRunningCount);
  const submitJob = useJobsStore((state) => state.submit);
  const dismissFinished = useJobsStore((state) => state.dismissFinished);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  const [form, setForm] = useState<StudioFormState>(() => initialForm(mode));
  const handoff = useDraftStore((state) => (state.draft?.mode === mode ? state.draft : null));
  const [appliedHandoff, setAppliedHandoff] = useState<number | null>(() => {
    const pending = useDraftStore.getState().draft;
    return pending?.mode === mode ? pending.nonce : null;
  });
  if (handoff && handoff.nonce !== appliedHandoff) {
    setAppliedHandoff(handoff.nonce);
    setForm((previous) => ({ ...previous, prompt: handoff.prompt }));
  }
  const [attempted, setAttempted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);

  const jobs = useMemo(() => allJobs.filter((job) => job.mode === mode), [allJobs, mode]);
  const finishedCount = jobs.filter((job) => job.status !== "running").length;
  const patchForm = useCallback((patch: Partial<StudioFormState>) => setForm((previous) => ({ ...previous, ...patch })), []);

  useEffect(() => {
    const consumed = consumeDraft(mode);
    if (consumed?.config) usePreferencesStore.getState().setConfig(consumed.config);
  }, [consumeDraft, mode, appliedHandoff]);

  useEffect(() => {
    const timer = setTimeout(
      () =>
        saveDraft(mode, {
          prompt: form.prompt,
          videoSource: form.videoSource,
          targetLanguage: form.targetLanguage,
          glossaries: form.glossaries,
          muxVideo: form.muxVideo,
          takes: form.takes,
        }),
      400,
    );
    return () => clearTimeout(timer);
  }, [form, mode, saveDraft]);

  const maxRequestBytes = status.data?.maxRequestBytes;
  const requestLimits = useMemo(() => (maxRequestBytes ? { maxRequestBytes } : undefined), [maxRequestBytes]);
  const validation = useMemo(() => validateStudioForm(mode, form, config, requestLimits), [mode, form, config, requestLimits]);
  const errors = useMemo(() => (validation.ok ? {} : visibleErrors(validation.errors, form, attempted)), [validation, form, attempted]);
  const previewRequest = developerOpen && validation.ok ? validation.request : null;
  const limits = clipLimits(mode);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(caret, caret);
  }, [form.prompt]);

  const speechSeconds = useMemo(() => estimateSpeech(form.prompt)?.seconds ?? null, [form.prompt]);

  const withCaret = (updater: (value: string, start: number, end: number) => { text: string; caret: number }) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? form.prompt.length;
    const end = textarea?.selectionEnd ?? form.prompt.length;
    const { text, caret } = updater(form.prompt, start, end);
    pendingCaret.current = caret;
    patchForm({ prompt: text });
  };

  const insertText = (snippet: string) => withCaret((value, start, end) => insertSnippet(value, snippet, start, end));

  const insertTag = (tag: string, label?: string) => {
    if (!label?.trim()) {
      insertText(tag);
      return;
    }
    const { snippet, caretFromEnd } = composeSpeakerLine(label, tag);
    withCaret((value, start, end) => {
      const inserted = insertSnippet(value, snippet, start, end);
      return { ...inserted, caret: inserted.caret - caretFromEnd };
    });
  };

  const submit = () => {
    const result = validateStudioForm(mode, form, config, requestLimits);
    if (!result.ok) {
      setAttempted(true);
      toast.error("Check the highlighted fields");
      return;
    }
    submitJob({ request: result.request, title: definition.title, takes: form.takes, muxVideo: mode === "video-translation" && form.muxVideo && status.data?.ffmpeg !== false });
  };

  const reuse = (job: Job) => {
    const request = job.request;
    if (request.mode !== "video-translation") patchForm({ prompt: request.prompt });
    setConfig(request.config);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Settings restored");
  };

  const handleConfigChange = (next: AudioConfig) => setConfig(next);

  const notConfigured = status.data?.configured === false;
  const maxConcurrency = status.data?.maxConcurrency ?? 2;
  const clipCount = form.referenceAudios.length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{definition.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{definition.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="self-start">
          Seed Audio 1.5
        </Badge>
      </header>

      {notConfigured ? (
        <Alert>
          <CircleAlert />
          <AlertTitle>The server is not configured</AlertTitle>
          <AlertDescription>
            Add SEED_AUDIO_API_KEY and SEED_AUDIO_MODEL to <code className="font-mono text-xs">.env.local</code> and restart the server.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-6">
              {definition.usesPrompt ? (
                <div className="space-y-3">
                  <PromptEditor
                    label={definition.promptLabel}
                    placeholder={definition.promptPlaceholder}
                    value={form.prompt}
                    error={errors.prompt}
                    speechSeconds={speechSeconds}
                    showTimeline={TIMELINE_MODES.includes(mode)}
                    textareaRef={textareaRef}
                    onChange={(prompt) => patchForm({ prompt })}
                    onSubmit={submit}
                    onOpenLibrary={() => setPickerOpen(true)}
                    onOpenToolkit={() => setToolkitOpen(true)}
                    onOpenTimeline={() => setTimelineOpen(true)}
                    onSave={() => setSaveOpen(true)}
                  />
                  <PromptInsights prompt={form.prompt} mode={mode} clipCount={clipCount} onFix={(prompt) => patchForm({ prompt })} />
                </div>
              ) : null}

              {definition.referenceImage ? (
                <ReferenceImageField value={form.referenceImage} error={errors.image} onChange={(referenceImage) => patchForm({ referenceImage })} />
              ) : null}

              {definition.referenceVideo !== "none" ? (
                <VideoSourceField
                  label={mode === "video-translation" ? "Source video" : "Reference video"}
                  value={form.videoSource}
                  error={errors.video}
                  onChange={(videoSource) => patchForm({ videoSource })}
                />
              ) : null}

              {definition.referenceAudio !== "none" ? (
                <ReferenceAudioField
                  title={definition.singleAudio ? "Audio to separate" : definition.referenceAudio === "optional" ? "Reference audio (optional)" : "Reference audio"}
                  description={
                    definition.singleAudio
                      ? "One wav or mp3 file, 2-360 seconds, up to 90 MB by URL or 15 MB when uploaded."
                      : "Voices to imitate. Tag them in your script as @Audio1, @Audio2 in this order."
                  }
                  items={form.referenceAudios}
                  maxItems={definition.singleAudio ? 1 : MAX_REFERENCE_AUDIOS}
                  minSeconds={limits.min}
                  maxSeconds={limits.max}
                  clipErrors={errors.clips}
                  showTags={!definition.singleAudio && definition.usesPrompt}
                  error={errors.audios}
                  onChange={(referenceAudios) => patchForm({ referenceAudios })}
                  onInsertTag={insertTag}
                />
              ) : null}

              {mode === "video-translation" ? (
                <TranslationFields
                  targetLanguage={form.targetLanguage}
                  glossaries={form.glossaries}
                  targetError={errors.targetLanguage}
                  glossaryError={errors.glossaries}
                  glossaryRowErrors={errors.glossaryRows}
                  onTargetChange={(targetLanguage) => patchForm({ targetLanguage })}
                  onGlossariesChange={(glossaries) => patchForm({ glossaries })}
                />
              ) : null}

              {mode === "video-translation" ? (
                <MuxOption checked={form.muxVideo} available={status.data?.ffmpeg} error={errors.mux} onChange={(muxVideo) => patchForm({ muxVideo })} />
              ) : null}

              <div className="space-y-3 border-t pt-4">
                <button type="button" onClick={() => setDeveloperOpen((value) => !value)} aria-expanded={developerOpen} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <Terminal className="size-3.5" /> Developer tools {developerOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
                {developerOpen ? <RequestPreview request={previewRequest} /> : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {definition.usesPrompt ? "Press Ctrl/Cmd + Enter to generate. " : ""}
                  {runningCount > 0 ? `${runningCount} running; the server runs ${maxConcurrency} at a time and queues the rest.` : `The API key allows ${maxConcurrency} concurrent requests.`}
                </p>
                <div className="flex items-center gap-2">
                  <Select value={String(form.takes)} onValueChange={(value) => patchForm({ takes: Number(value) })}>
                    <SelectTrigger size="sm" className="w-28" aria-label="Number of takes">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: MAX_TAKES }, (_, index) => index + 1).map((count) => (
                        <SelectItem key={count} value={String(count)}>
                          {count} {count === 1 ? "take" : "takes"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="lg" className="min-w-36 rounded-full px-5" onClick={submit} disabled={notConfigured}>
                    <Sparkles />
                    {form.takes > 1 ? `Generate ${form.takes} takes` : "Generate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4" aria-live="polite">
            {finishedCount > 1 ? (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="xs" onClick={() => dismissFinished(mode)}>
                  Clear finished ({finishedCount})
                </Button>
              </div>
            ) : null}
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onReuse={reuse} />
            ))}
            {jobs.length === 0 ? <EmptyResults /> : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-8">
          <Card>
            <CardContent>
              <AudioSettings config={config} error={errors.config} onChange={handleConfigChange} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <PromptPicker
        mode={mode}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(entry) => {
          patchForm({ prompt: entry.prompt });
          setPickerOpen(false);
          if (entry.referenceClips) toast.info(`This example expects ${entry.referenceClips} reference clip${entry.referenceClips > 1 ? "s" : ""}.`);
        }}
        onSelectSaved={(saved) => {
          patchForm({ prompt: saved.prompt });
          setPickerOpen(false);
        }}
      />
      <PromptToolkit
        mode={mode}
        prompt={form.prompt}
        open={toolkitOpen}
        onOpenChange={setToolkitOpen}
        insert={insertText}
        append={(block) => patchForm({ prompt: appendBlock(form.prompt, block) })}
        replace={(text) => {
          patchForm({ prompt: text });
          setToolkitOpen(false);
        }}
        setConstraints={(header) => patchForm({ prompt: setConstraintHeader(form.prompt, header) })}
      />
      <TimelineBuilder
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        mode={mode}
        clipCount={clipCount}
        onInsert={(script, replace) => {
          patchForm({ prompt: replace ? script : appendBlock(form.prompt, script) });
          setTimelineOpen(false);
          toast.success(replace ? "Prompt replaced with the timeline script" : "Timeline script appended");
        }}
      />
      <SavePromptDialog open={saveOpen} onOpenChange={setSaveOpen} prompt={form.prompt} mode={mode} />
    </div>
  );
}
