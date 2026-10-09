"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MODE_HREFS } from "@/components/layout/nav-items";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODE_DEFINITIONS } from "@/lib/seed-audio/modes";
import { useSavedPromptsHydrated } from "@/hooks/use-hydrated";
import { useSavedPromptsStore } from "@/stores/saved-prompts";
import { Input } from "@/components/ui/input";
import { PROMPT_CATEGORIES, PROMPT_LIBRARY, type PromptCategory, type PromptEntry } from "@/data/prompt-library";
import { cn } from "@/lib/utils";
import { useDraftStore } from "@/stores/draft";
import { PromptCard } from "./prompt-card";

function MyPrompts() {
  const router = useRouter();
  const hydrated = useSavedPromptsHydrated();
  const items = useSavedPromptsStore((state) => state.items);
  const remove = useSavedPromptsStore((state) => state.remove);
  const setDraft = useDraftStore((state) => state.setDraft);

  if (!hydrated) return null;
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No saved prompts yet. Use Save in any studio prompt editor.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</h3>
            <Badge variant="outline">{MODE_DEFINITIONS[item.mode].title}</Badge>
          </div>
          <p className="line-clamp-4 rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{item.prompt}</p>
          <div className="mt-auto flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>
              <Trash2 />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDraft({ mode: item.mode, prompt: item.prompt });
                router.push(MODE_HREFS[item.mode]);
              }}
            >
              Open in studio <ArrowUpRight />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PromptLibrary() {
  const router = useRouter();
  const savedCount = useSavedPromptsStore((state) => state.items.length);
  const setDraft = useDraftStore((state) => state.setDraft);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PromptCategory | "All">("All");

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PROMPT_LIBRARY.filter((entry) => {
      if (category !== "All" && entry.category !== category) return false;
      if (!needle) return true;
      return [entry.title, entry.description, entry.prompt].some((text) => text.toLowerCase().includes(needle));
    });
  }, [query, category]);

  const open = (entry: PromptEntry) => {
    const mode = entry.modes[0];
    setDraft({ mode, prompt: entry.prompt });
    router.push(MODE_HREFS[mode]);
  };

  return (
    <Tabs defaultValue="library" className="space-y-6">
      <TabsList>
        <TabsTrigger value="library">Library ({PROMPT_LIBRARY.length})</TabsTrigger>
        <TabsTrigger value="mine">My prompts ({savedCount})</TabsTrigger>
      </TabsList>
      <TabsContent value="mine">
        <MyPrompts />
      </TabsContent>
      <TabsContent value="library" className="space-y-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prompts" className="h-10 pl-9" aria-label="Search prompts" />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {(["All", ...PROMPT_CATEGORIES] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === item ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No prompts match your search.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <PromptCard
              key={entry.id}
              entry={entry}
              actions={
                <Button type="button" size="sm" onClick={() => open(entry)}>
                  Open in studio <ArrowUpRight />
                </Button>
              }
            />
          ))}
        </div>
      )}
      </TabsContent>
    </Tabs>
  );
}
