"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active]);

  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
