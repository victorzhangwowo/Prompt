import { NextResponse } from 'next/server';
import { getCloudflareBindings } from '@/lib/cloudflare';

export const runtime = 'edge';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

function guessMime(key: string): string {
  const dot = key.lastIndexOf('.');
  if (dot !== -1) {
    const ext = key.slice(dot).toLowerCase();
    if (MIME_MAP[ext]) return MIME_MAP[ext];
  }
  return 'application/octet-stream';
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const rawKey = params.path.join('/').replace(/^\/+/, '');
    if (!rawKey || rawKey.includes('..')) {
      return new NextResponse('Invalid media path', { status: 400 });
    }

    const { r2 } = getCloudflareBindings();
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const fullObj = await r2.get(rawKey);
        if (!fullObj) {
          return new NextResponse('Media not found', { status: 404 });
        }
        const totalSize = fullObj.size;
        const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
        const length = end - start + 1;
        const rangedObj = await r2.get(rawKey, { range: { offset: start, length } });
        if (!rangedObj) {
          return new NextResponse('Media range error', { status: 416 });
        }
        const contentType = rangedObj.httpMetadata?.contentType || guessMime(rawKey);
        return new NextResponse(rangedObj.body, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(length),
            'Content-Type': contentType,
          },
        });
      }
    }

    const obj = await r2.get(rawKey);
    if (!obj) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const contentType = obj.httpMetadata?.contentType || guessMime(rawKey);
    return new NextResponse(obj.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(obj.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error serving media: ${err.message}`, { status: 500 });
  }
}
