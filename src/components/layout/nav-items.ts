import {
  AudioLines,
  BookOpen,
  Clapperboard,
  FileText,
  History,
  Home,
  Languages,
  Layers,
  Mic,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { StudioMode } from "@/lib/seed-audio/modes";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MODE_ICONS: Record<StudioMode, LucideIcon> = {
  "text-to-audio": AudioLines,
  "reference-voice": Mic,
  "video-to-audio": Clapperboard,
  "video-translation": Languages,
  "stem-separation": Layers,
};

export const MODE_HREFS: Record<StudioMode, string> = {
  "text-to-audio": "/studio/text-to-audio",
  "reference-voice": "/studio/reference-voice",
  "video-to-audio": "/studio/video-to-audio",
  "video-translation": "/studio/video-translation",
  "stem-separation": "/studio/stem-separation",
};

export const HOME_ITEM: NavItem = { href: "/", label: "Home", icon: Home };

export const RESOURCE_ITEMS: NavItem[] = [
  { href: "/library", label: "Prompt Library", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/reference", label: "API Reference", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
