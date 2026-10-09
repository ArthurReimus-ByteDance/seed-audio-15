import Link from "next/link";
import { GeneratingBars } from "@/components/audio/generating-bars";
import { ModeGrid } from "@/components/home/mode-grid";
import { RecentGenerations } from "@/components/home/recent-generations";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand-soft via-card to-card px-6 py-10 sm:px-10 sm:py-14">
        <div className="relative z-10 max-w-xl space-y-4">
          <p className="text-xs font-medium tracking-wider text-brand uppercase">Seed Audio 1.5 · Early access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">What will you create today?</h1>
          <p className="text-muted-foreground">
            Speech, dialogue, ambience and dubbing from a single prompt. Try every Seed Audio capability here, then take the best prompts to production.
          </p>
        </div>
        <GeneratingBars className="pointer-events-none absolute right-6 bottom-6 hidden h-24 opacity-50 xl:flex" />
      </section>

      <p className="rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Early access, confidential.</span> Do not share outputs or screenshots publicly. Early-access keys stop working after the official release (tentatively Oct. 28).
      </p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Create</h2>
        <ModeGrid />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent generations</h2>
          <Link href="/history" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            View all
          </Link>
        </div>
        <RecentGenerations />
      </section>
    </div>
  );
}
