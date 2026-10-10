"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BytePlusLogo } from "@/components/brand/byteplus-logo";
import { MODE_DEFINITIONS, STUDIO_MODES } from "@/lib/seed-audio/modes";
import { cn } from "@/lib/utils";
import { HOME_ITEM, MODE_HREFS, MODE_ICONS, RESOURCE_ITEMS, type NavItem } from "./nav-items";
import { JobsIndicator } from "./jobs-indicator";
import { ServiceStatus } from "./service-status";
import { ThemeToggle } from "./theme-toggle";

const CREATE_ITEMS: NavItem[] = STUDIO_MODES.map((mode) => ({
  href: MODE_HREFS[mode],
  label: MODE_DEFINITIONS[mode].navLabel,
  icon: MODE_ICONS[mode],
}));

function NavSection({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-1">
      {title ? (
        <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{title}</p>
      ) : null}
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-brand")} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex flex-col gap-3 px-2 pt-1" aria-label="Seed Audio Studio home">
        <BytePlusLogo className="h-6" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight">Seed Audio Studio</span>
          <span className="block text-[11px] text-muted-foreground">Model 1.5 · Early access</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Main">
        <NavSection items={[HOME_ITEM]} onNavigate={onNavigate} />
        <NavSection title="Create" items={CREATE_ITEMS} onNavigate={onNavigate} />
        <NavSection title="Resources" items={RESOURCE_ITEMS} onNavigate={onNavigate} />
      </nav>
      <JobsIndicator onNavigate={onNavigate} />
      <div className="flex items-center gap-2">
        <ServiceStatus className="min-w-0 flex-1" />
        <ThemeToggle />
      </div>
    </div>
  );
}
