import { NextResponse } from 'next/server';
import { getCloudflareBindings } from '@/lib/cloudflare';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isCloudflare } = getCloudflareBindings();
  return NextResponse.json({
    ok: true,
    runtime: isCloudflare ? 'cloudflare-pages' : 'local-dev',
    port: isCloudflare ? null : 5059,
    timestamp: Date.now(),
  });
}
