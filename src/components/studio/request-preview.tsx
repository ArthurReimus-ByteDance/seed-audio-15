"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { previewPayload, toCurl } from "@/lib/seed-audio/inspect";
import { buildUpstreamPayload } from "@/lib/seed-audio/payload";
import type { GenerateRequest } from "@/lib/seed-audio/schemas";

export function RequestPreview({ request }: { request: GenerateRequest | null }) {
  const [copied, setCopied] = useState<"json" | "curl" | null>(null);
  const payload = useMemo(() => (request ? buildUpstreamPayload("model", request) : null), [request]);
  const json = useMemo(() => (payload ? JSON.stringify(previewPayload(payload), null, 2) : ""), [payload]);

  const copy = async (kind: "json" | "curl") => {
    if (!payload) return;
    if (await copyText(kind === "json" ? json : toCurl(payload))) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } else toast.error("Could not copy to the clipboard");
  };

  if (!payload) {
    return <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">Complete the form to preview the exact request that will be sent to Seed Audio.</p>;
  }

  return (
    <div className="space-y-3">
      <pre className="max-h-72 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">{json}</pre>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="xs" onClick={() => void copy("curl")}>
          {copied === "curl" ? <Check /> : <Terminal />} Copy as cURL
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={() => void copy("json")}>
          {copied === "json" ? <Check /> : <Copy />} Copy JSON
        </Button>
        <span className="text-xs text-muted-foreground">The model is read from the server; uploaded audio and images are shown as placeholders.</span>
      </div>
    </div>
  );
}
