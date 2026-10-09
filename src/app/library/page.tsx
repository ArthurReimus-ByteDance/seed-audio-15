import type { Metadata } from "next";
import { PromptLibrary } from "@/components/library/prompt-library";

export const metadata: Metadata = { title: "Prompt Library" };

export default function Page() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Prompt Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Proven structures for voice-overs, dialogue, timeline scripts, reference voices and dubbing. Open one in the studio and make it your own.
        </p>
      </header>
      <PromptLibrary />
    </div>
  );
}
