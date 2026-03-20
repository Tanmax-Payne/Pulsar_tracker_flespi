/**
 * app/api/flespi/[...path]/route.ts
 *
 * Server-side proxy for all Flespi REST calls.
 * Browser → /api/flespi/gw/devices/... → flespi.io (no CORS issue)
 * Token stays server-side only (FLESPI_TOKEN, no NEXT_PUBLIC prefix).
 */

import { NextRequest, NextResponse } from "next/server";

const FLESPI_BASE = "https://flespi.io";
const TOKEN = process.env.FLESPI_TOKEN ?? "";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = "/" + path.join("/");
  const search   = req.nextUrl.search ?? "";
  const url      = `${FLESPI_BASE}${pathname}${search}`;

  if (!TOKEN) {
    return NextResponse.json({ error: "FLESPI_TOKEN not set on server" }, { status: 500 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: `FlespiToken ${TOKEN}`,
        "Content-Type": "application/json",
      },
      // Don't cache at the edge — our lib handles caching
      cache: "no-store",
    });

    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}