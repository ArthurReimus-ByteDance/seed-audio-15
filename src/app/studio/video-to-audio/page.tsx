import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = { title: "Video to Audio" };

export default function Page() {
  return <Studio mode="video-to-audio" />;
}
