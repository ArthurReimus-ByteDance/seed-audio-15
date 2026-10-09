import type { Metadata } from "next";
import { SettingsPanel } from "@/components/layout/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Server status, appearance and the data stored in this browser.</p>
      </header>
      <SettingsPanel />
    </div>
  );
}
