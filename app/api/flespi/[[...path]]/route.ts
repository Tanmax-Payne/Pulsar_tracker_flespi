import { NextRequest, NextResponse } from "next/server";

const FLESPI_BASE = "https://flespi.io";
const TOKEN = process.env.FLESPI_TOKEN ?? "";

// The only shapes the app ever actually requests. Previously this proxy
// forwarded any path under flespi.io using the privileged server token —
// an open reverse proxy to the whole Flespi account for anyone who found
// the URL. Narrowing it here costs nothing for legitimate traffic.
const ALLOWED_PATH_RE = /^\/gw\/devices\/[\d,]+(\/(telemetry|messages))?$/;

// Server-side cache + request budget, shared across every client hitting
// this warm instance. Per Flespi's published Restrictions (flespi.com/en/
// docs/restrictions): free tier allows 200 REST requests/minute, and
// exceeding it doesn't just reject the excess request — the ENTIRE TOKEN
// is suspended for a full 60 seconds, rejecting everything until it
// clears. The previous rate limiter lived only in the browser (a per-tab
// token bucket), which can't coordinate across tabs or users, so N
// viewers meant N independent polling loops against the same account-wide
// cap. This collapses duplicate requests (multiple viewers of the same
// device) and stops forwarding once the shared budget is spent.
//
// Caveat: Vercel may run multiple concurrent serverless instances under
// load, each with its own copy of this module-scope state, so this isn't
// a truly global ceiling — it's a per-instance one. Combined with the
// suspendedUntil cooldown below (which reacts to Flespi's *own* signal
// rather than just our local guess), this is the practical fix available
// without standing up an external shared store for an app this size.
interface CacheEntry { body: unknown; status: number; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function ttlForPath(pathname: string, search: string): number {
  if (pathname.endsWith("/telemetry")) return 3_000;
  if (pathname.endsWith("/messages") && search.includes("reverse")) return 3_000; // latest message
  if (pathname.endsWith("/messages")) return 60_000; // history range query
  return 20_000; // device info list
}

const WINDOW_MS = 60_000;
const BUDGET_PER_WINDOW = 80; // headroom under Flespi's real 200/min free-tier cap
let windowStart = Date.now();
let windowCount = 0;

// Once Flespi itself 429s us, believe it immediately — continuing to send
// requests during their documented 1-minute suspension window is
// guaranteed-wasted quota and just compounds the outage.
let suspendedUntil = 0;

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

  if (now < suspendedUntil) {
    if (cached) {
      return NextResponse.json(cached.body, {
        status: cached.status,
        headers: { "x-flespi-proxy-cache": "stale-suspended" },
      });
    }
    return NextResponse.json(
      { error: `Flespi token suspended until ${new Date(suspendedUntil).toISOString()} (hit the account's rate limit) — serving no data until then` },
      { status: 429 },
    );
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

    if (upstream.status === 429) {
      // Flespi suspends the whole token for 1 minute on overshoot — honor
      // that exactly instead of continuing to burn (and extend) it.
      suspendedUntil = now + 60_000;
    }

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
