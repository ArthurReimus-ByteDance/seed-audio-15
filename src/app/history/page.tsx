import type { Metadata } from "next";
import { HistoryList } from "@/components/history/history-list";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your last generations, stored locally in this browser (up to 40). Audio links from the API expire after about a day, so copies are kept on your device.
        </p>
      </header>
      <HistoryList />
    </div>
  );
}
