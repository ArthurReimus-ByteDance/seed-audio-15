import { cn } from "@/lib/utils";

const BAR_COUNT = 28;

export function GeneratingBars({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-16 items-center justify-center gap-1", className)} aria-hidden>
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          className="bar-bounce h-full w-1 rounded-full bg-gradient-to-t from-brand to-brand/30"
          style={{ animationDelay: `${(index % 9) * 110}ms`, height: `${30 + ((index * 37) % 70)}%` }}
        />
      ))}
    </div>
  );
}
