import { NextRequest, NextResponse } from 'next/server';
import { FlespiService } from '@/lib/flespiService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token') || process.env.FLESPI_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'FLESPI_TOKEN not configured' }, { status: 500 });
  }

  const { path: rawPath } = await params;
  const path = rawPath || [];

  try {
    // Basic proxy logic
    // /api/flespi/devices -> FlespiService.getDevices
    // /api/flespi/devices/[id]/telemetry -> FlespiService.getDeviceTelemetry
    // /api/flespi/devices/[id]/messages -> FlespiService.getDeviceMessages

    if (path[0] === 'devices' && path.length === 1) {
      const devices = await FlespiService.getDevices(token);
      return NextResponse.json(devices);
    }

    if (path[0] === 'devices' && path.length === 3) {
      const deviceId = parseInt(path[1]);
      const subPath = path[2];

      if (subPath === 'telemetry') {
        const telemetry = await FlespiService.getDeviceTelemetry(token, deviceId);
        return NextResponse.json(telemetry);
      }

      if (subPath === 'messages') {
        const limit = parseInt(searchParams.get('limit') || '100');
        const from = searchParams.get('from') ? parseInt(searchParams.get('from')!) : undefined;
        const to = searchParams.get('to') ? parseInt(searchParams.get('to')!) : undefined;
        const messages = await FlespiService.getDeviceMessages(token, deviceId, limit, from, to);
        return NextResponse.json(messages);
      }
    }

    return NextResponse.json({ error: 'Invalid API path' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
