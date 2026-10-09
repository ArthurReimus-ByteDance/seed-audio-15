import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = { title: "Video Dubbing" };

export default function Page() {
  return <Studio mode="video-translation" />;
}
