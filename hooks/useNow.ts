"use client";

import { useEffect, useState } from "react";

// Shared "current time" tick for any component that needs to render
// relative/freshness info (e.g. "4s ago"). Centralized so Date.now()
// is sampled in exactly one place instead of once per component.
//
// Starts at null rather than Date.now(): a lazy useState(() => Date.now())
// initializer runs once during SSR and again during client hydration —
// two genuinely different instants — so any text derived from it (the
// status bar clock, every "Xs ago" label) can render different text on
// the server vs. the client, which React flags as a hydration error
// (#418). Starting at null keeps the first server and client render
// identical; the real value arrives moments after mount instead.
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const firstTick = setTimeout(tick, 0); // deferred, not synchronous — gets a real value almost immediately without violating react-hooks/purity
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(firstTick);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}
