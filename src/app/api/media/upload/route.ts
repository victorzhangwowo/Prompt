import { NextResponse } from 'next/server';
import { getCloudflareBindings } from '@/lib/cloudflare';

export const runtime = 'edge';

function getFileExt(name: string, isVideo: boolean): string {
  const dot = name.lastIndexOf('.');
  if (dot !== -1 && dot < name.length - 1) {
    return name.slice(dot).toLowerCase();
  }
  return isVideo ? '.mp4' : '.jpg';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isCover = formData.get('isCover') === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: '未提供上传文件' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/');

    let subfolder = 'images';
    if (isCover) {
      subfolder = 'covers';
    } else if (isVideo) {
      subfolder = 'videos';
    }

    const originalName = file.name || (isVideo ? 'upload.mp4' : 'upload.jpg');
    const ext = getFileExt(originalName, isVideo);
    const rawBase = originalName.slice(0, originalName.length - ext.length);
    const safeBase = rawBase.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_') || 'asset';
    const finalFileName = `${Date.now()}-${safeBase}${ext}`;
    const r2Key = `${subfolder}/${finalFileName}`;

    const bytes = await file.arrayBuffer();
    const { r2 } = getCloudflareBindings();
    await r2.put(r2Key, bytes, {
      httpMetadata: { contentType: mimeType },
    });

    const relativeMediaPath = `media/${r2Key}`;

    return NextResponse.json({
      success: true,
      mediaPath: relativeMediaPath,
      url: `/api/${relativeMediaPath}`,
      fileName: finalFileName,
      mimeType,
      size: file.size,
      isVideo,
    });
  } catch (err: any) {
    console.error('Upload media error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
