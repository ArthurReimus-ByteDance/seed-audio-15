import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = { title: "Text to Audio" };

export default function Page() {
  return <Studio mode="text-to-audio" />;
}
