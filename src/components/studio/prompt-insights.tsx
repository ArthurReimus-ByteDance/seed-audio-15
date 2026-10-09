"use client";

import { CircleAlert, CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { lintPrompt, type LintContext, type LintSeverity } from "@/lib/prompt/lint";
import { cn } from "@/lib/utils";

const ICONS = { error: CircleAlert, warning: TriangleAlert, tip: Lightbulb } as const;
const TONES: Record<LintSeverity, string> = {
  error: "text-destructive",
  warning: "text-warning",
  tip: "text-muted-foreground",
};

type PromptInsightsProps = LintContext & { prompt: string; onFix: (nextPrompt: string) => void };

export function PromptInsights({ prompt, mode, clipCount, onFix }: PromptInsightsProps) {
  const issues = useMemo(() => lintPrompt(prompt, { mode, clipCount }), [prompt, mode, clipCount]);
  if (!prompt.trim()) return null;

  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <CircleCheck className="size-3.5 text-success" /> Prompt check: nothing to flag against the Seed Audio prompt guide.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3" aria-label="Prompt check">
      {issues.map((issue) => {
        const Icon = ICONS[issue.severity];
        return (
          <li key={issue.id} className="flex items-start gap-2 text-xs">
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", TONES[issue.severity])} />
            <span className="flex-1">{issue.message}</span>
            {issue.fix ? (
              <Button type="button" variant="outline" size="xs" onClick={() => onFix(issue.fix!.apply(prompt))}>
                {issue.fix.label}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
