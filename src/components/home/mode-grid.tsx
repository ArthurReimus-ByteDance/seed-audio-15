import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { MODE_HREFS, MODE_ICONS } from "@/components/layout/nav-items";
import { MODE_DEFINITIONS, STUDIO_MODES } from "@/lib/seed-audio/modes";

export function ModeGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {STUDIO_MODES.map((mode) => {
        const Icon = MODE_ICONS[mode];
        const { title, description } = MODE_DEFINITIONS[mode];
        return (
          <Link
            key={mode}
            href={MODE_HREFS[mode]}
            className="group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ArrowUpRight className="absolute top-5 right-5 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
