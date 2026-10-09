import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = { title: "Reference Voice" };

export default function Page() {
  return <Studio mode="reference-voice" />;
}
