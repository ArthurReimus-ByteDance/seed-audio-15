"use client";

import { Download, LogOut, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useServiceStatus } from "@/hooks/use-service-status";
import { getErrorMessage, http } from "@/lib/api/http";
import { formatBytes } from "@/lib/format";
import { mergeSavedPrompts, parseSavedPrompts, serializeSavedPrompts } from "@/lib/saved-prompts-io";
import { useHistoryStore } from "@/stores/history";
import { usePreferencesStore } from "@/stores/preferences";
import { SAVED_PROMPT_LIMIT, useSavedPromptsStore } from "@/stores/saved-prompts";
import { useStudioDraftsStore } from "@/stores/studio-drafts";
import { ConfirmButton } from "./confirm-button";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Card>
        <CardContent className="divide-y">{children}</CardContent>
      </Card>
    </section>
  );
}

function useStorageEstimate() {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const entries = useHistoryStore((state) => state.entries.length);

  useEffect(() => {
    let active = true;
    void navigator.storage?.estimate?.().then((result) => {
      if (active && result.usage !== undefined && result.quota !== undefined) setEstimate({ usage: result.usage, quota: result.quota });
    });
    return () => {
      active = false;
    };
  }, [entries]);

  return estimate;
}

export function SettingsPanel() {
  const router = useRouter();
  const status = useServiceStatus();
  const { theme = "system", setTheme } = useTheme();
  const history = useHistoryStore((state) => state.entries);
  const clearHistory = useHistoryStore((state) => state.clear);
  const savedPrompts = useSavedPromptsStore((state) => state.items);
  const hydratedPrompts = useSavedPromptsStore((state) => state.hydrated);
  const clearDrafts = useStudioDraftsStore((state) => state.clearAll);
  const setConfig = usePreferencesStore((state) => state.setConfig);
  const importInput = useRef<HTMLInputElement>(null);
  const storage = useStorageEstimate();

  const exportPrompts = () => {
    const blob = new Blob([serializeSavedPrompts(savedPrompts)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "seed-audio-prompts.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importPrompts = async (file: File) => {
    const result = parseSavedPrompts(await file.text());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const existing = useSavedPromptsStore.getState().items;
    const merged = mergeSavedPrompts(existing, result.prompts, SAVED_PROMPT_LIMIT);
    useSavedPromptsStore.setState({ items: merged });
    const added = Math.max(0, merged.length - existing.length);
    const skipped = result.prompts.length - added;
    toast.success(`Imported ${added} new prompt${added === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} already existed)` : ""}`);
  };

  const logout = async () => {
    try {
      await http.delete("/auth");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const data = status.data;

  return (
    <div className="space-y-10">
      <Panel title="Server" description="Read from the server's environment. The API key itself is never sent to the browser.">
        {status.isPending ? (
          <Skeleton className="my-3 h-24 w-full" />
        ) : status.isError || !data ? (
          <Row label="Status">
            <Badge variant="destructive">Unreachable</Badge>
          </Row>
        ) : (
          <>
            <Row label="API key and model">{data.configured ? <Badge className="bg-success/15 text-success">Configured</Badge> : <Badge variant="outline">Missing</Badge>}</Row>
            <Row label="Model endpoint ID">
              <code className="font-mono text-xs">{data.modelHint ?? "not set"}</code>
            </Row>
            <Row label="Endpoint host">
              <code className="font-mono text-xs">{data.endpointHost}</code>
            </Row>
            <Row label="Concurrency">
              {data.inFlight} of {data.maxConcurrency} running{data.queued > 0 ? `, ${data.queued} queued` : ""}
            </Row>
            <Row label="Video muxing (ffmpeg)">
              {data.ffmpeg ? <Badge className="bg-success/15 text-success">Available</Badge> : <span className="text-muted-foreground">Not found (set FFMPEG_PATH)</span>}
            </Row>
            <Row label="Access code">
              {data.accessGate ? (
                <span className="flex items-center gap-2">
                  Required
                  <Button type="button" variant="outline" size="xs" onClick={() => void logout()}>
                    <LogOut /> Sign out
                  </Button>
                </span>
              ) : (
                <span className="text-muted-foreground">Off (set STUDIO_ACCESS_CODE to enable)</span>
              )}
            </Row>
          </>
        )}
      </Panel>

      <Panel title="Appearance">
        <Row label="Theme">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-36" size="sm" aria-label="Theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Panel>

      <Panel title="Browser storage" description="Everything below lives only in this browser. Nothing is stored on the server.">
        <Row label="Space used">{storage ? `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)}` : "Unknown"}</Row>
        <Row label="Generations in history">{history.length}</Row>
        <Row label="Saved prompts">{hydratedPrompts ? savedPrompts.length : "..."}</Row>
        <div className="flex flex-wrap items-center gap-2 py-3">
          <ConfirmButton variant="outline" size="sm" disabled={history.length === 0} onConfirm={() => { clearHistory(); toast.success("History cleared"); }}>
            Clear history
          </ConfirmButton>
          <ConfirmButton variant="outline" size="sm" onConfirm={() => { clearDrafts(); toast.success("Saved form drafts cleared"); }}>
            Clear drafts
          </ConfirmButton>
          <ConfirmButton variant="outline" size="sm" onConfirm={() => { setConfig({}); toast.success("Output settings reset"); }}>
            Reset output settings
          </ConfirmButton>
        </div>
      </Panel>

      <Panel title="Prompt backup" description="Move your saved prompts between browsers or teammates as a JSON file.">
        <div className="flex flex-wrap items-center gap-2 py-3">
          <Button type="button" variant="outline" size="sm" disabled={savedPrompts.length === 0} onClick={exportPrompts}>
            <Download /> Export prompts
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => importInput.current?.click()}>
            <Upload /> Import prompts
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPrompts(file);
              event.target.value = "";
            }}
          />
        </div>
      </Panel>
    </div>
  );
}
