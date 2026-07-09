"use client";

import { useEffect, useState } from "react";

// Shared "current time" tick for any component that needs to render
// relative/freshness info (e.g. "4s ago"). Centralized so Date.now()
// is sampled in exactly one place instead of once per component.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
