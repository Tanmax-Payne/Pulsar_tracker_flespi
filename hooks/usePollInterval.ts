"use client";

import { useCallback, useState } from "react";
import { DEFAULT_POLL_MS, POLL_STORAGE_KEY, isValidPollMs } from "@/lib/pollInterval";

export function usePollInterval() {
  const [pollMs, setPollMsState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_POLL_MS;
    const saved = Number(window.localStorage.getItem(POLL_STORAGE_KEY));
    return isValidPollMs(saved) ? saved : DEFAULT_POLL_MS;
  });

  const setPollMs = useCallback((ms: number) => {
    setPollMsState(ms);
    localStorage.setItem(POLL_STORAGE_KEY, String(ms));
  }, []);

  return { pollMs, setPollMs };
}
