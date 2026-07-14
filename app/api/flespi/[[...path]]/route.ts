import { NextRequest, NextResponse } from "next/server";

const FLESPI_BASE = "https://flespi.io";
const TOKEN = process.env.FLESPI_TOKEN ?? "";

// The only shapes the app ever actually requests. Previously this proxy
// forwarded any path under flespi.io using the privileged server token —
// an open reverse proxy to the whole Flespi account for anyone who found
// the URL. Narrowing it here costs nothing for legitimate traffic.
const ALLOWED_PATH_RE = /^\/gw\/devices\/[\d,]+(\/(telemetry|messages))?$/;

// Server-side cache + request budget, shared across every client hitting
// this warm instance. Flespi's free tier caps at ~100 requests/minute
// account-wide — the previous rate limiter lived only in the browser
// (a per-tab token bucket), which can't coordinate across tabs or users,
// so N viewers meant N independent polling loops against the same cap.
// This collapses duplicate requests (multiple viewers of the same
// device) and stops forwarding once the shared budget is spent for the
// window, serving stale cache instead of piling on more 429s.
interface CacheEntry { body: unknown; status: number; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function ttlForPath(pathname: string, search: string): number {
  if (pathname.endsWith("/telemetry")) return 3_000;
  if (pathname.endsWith("/messages") && search.includes("reverse")) return 3_000; // latest message
  if (pathname.endsWith("/messages")) return 60_000; // history range query
  return 20_000; // device info list
}

const WINDOW_MS = 60_000;
const BUDGET_PER_WINDOW = 80; // headroom under Flespi's ~100/min free-tier cap
let windowStart = Date.now();
let windowCount = 0;

function withinBudget(): boolean {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  return windowCount < BUDGET_PER_WINDOW;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }   // path is optional in Next.js 15 catch-all
) {
  if (!TOKEN) {
    return NextResponse.json({ error: "FLESPI_TOKEN not set" }, { status: 500 });
  }

  const { path } = await params;
  const pathname = "/" + (path ?? []).join("/");
  const search   = req.nextUrl.search ?? "";

  if (!ALLOWED_PATH_RE.test(pathname)) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 });
  }

  const cacheKey = pathname + search;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  if (!withinBudget()) {
    if (cached) {
      return NextResponse.json(cached.body, {
        status: cached.status,
        headers: { "x-flespi-proxy-cache": "stale-budget" },
      });
    }
    return NextResponse.json(
      { error: "Local request budget exceeded for this minute — try again shortly" },
      { status: 429 },
    );
  }

  windowCount++;

  try {
    const url = `${FLESPI_BASE}${pathname}${search}`;
    const upstream = await fetch(url, {
      headers: { Authorization: `FlespiToken ${TOKEN}` },
      cache: "no-store",
    });
    const body = await upstream.json();
    cache.set(cacheKey, { body, status: upstream.status, expiresAt: now + ttlForPath(pathname, search) });
    return NextResponse.json(body, { status: upstream.status });
  } catch (err) {
    if (cached) {
      return NextResponse.json(cached.body, {
        status: cached.status,
        headers: { "x-flespi-proxy-cache": "stale-error" },
      });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
