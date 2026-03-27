import { NextRequest, NextResponse } from "next/server";

const FLESPI_BASE = "https://flespi.io";
const TOKEN = process.env.FLESPI_TOKEN ?? "";

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
  const url      = `${FLESPI_BASE}${pathname}${search}`;

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `FlespiToken ${TOKEN}` },
      cache: "no-store",
    });
    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
