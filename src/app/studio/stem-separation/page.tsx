import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = { title: "Stem Separation" };

export default function Page() {
  return <Studio mode="stem-separation" />;
}
