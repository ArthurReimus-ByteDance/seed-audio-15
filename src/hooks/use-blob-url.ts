"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { loadBlob } from "@/lib/storage/audio-blobs";

export function useStoredBlob(key: string, enabled = true) {
  const query = useQuery({
    queryKey: ["stored-blob", key],
    queryFn: async () => (await loadBlob(key)) ?? null,
    enabled,
    staleTime: Infinity,
    gcTime: 0,
  });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const objectUrl = URL.createObjectURL(query.data);
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setUrl(objectUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [query.data]);

  return { url, blob: query.data ?? null, isLoading: query.isLoading, missing: query.isSuccess && query.data === null };
}
