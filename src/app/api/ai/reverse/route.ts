import { NextResponse } from 'next/server';
import { getCloudflareBindings } from '@/lib/cloudflare';
import { reversePromptFromMedia, arrayBufferToBase64 } from '@/lib/gemini';

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
    const contentType = request.headers.get('content-type') || '';
    const { r2 } = getCloudflareBindings();

    let base64Data = '';
    let mimeType = '';
    let savedMediaPath = '';
    let apiKey: string | undefined = undefined;
    let selectedModel: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      apiKey = (formData.get('apiKey') as string) || undefined;
      selectedModel =
        (formData.get('selectedModel') as string) ||
        (formData.get('model') as string) ||
        undefined;

      if (!file) {
        return NextResponse.json({ success: false, error: '未提供文件' }, { status: 400 });
      }

      // Guard Cloudflare Workers memory limit for huge inline base64 videos
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: '文件体积超过 20MB，Cloudflare Pages 边缘运行时建议压缩至 20MB 以内再进行反推。',
          },
          { status: 413 }
        );
      }

      mimeType = file.type || 'image/jpeg';
      const isVideo = mimeType.startsWith('video/');
      const subfolder = isVideo ? 'videos' : 'images';

      const ext = getFileExt(file.name || '', isVideo);
      const rawBase = (file.name || 'asset').slice(0, Math.max(0, (file.name || 'asset').length - ext.length));
      const safeBase = rawBase.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_') || 'asset';
      const finalFileName = `${Date.now()}-${safeBase}${ext}`;
      const r2Key = `${subfolder}/${finalFileName}`;

      const bytes = await file.arrayBuffer();
      await r2.put(r2Key, bytes, {
        httpMetadata: { contentType: mimeType },
      });

      savedMediaPath = `media/${r2Key}`;
      base64Data = arrayBufferToBase64(bytes);
    } else {
      const json = await request.json();
      apiKey = json.apiKey;
      selectedModel = json.selectedModel || json.model;
      const mediaPath = String(json.mediaPath || '');

      if (!mediaPath) {
        return NextResponse.json({ success: false, error: '缺少 mediaPath 参数' }, { status: 400 });
      }

      savedMediaPath = mediaPath;
      const r2Key = mediaPath.replace(/^media\//, '');
      const obj = await r2.get(r2Key);
      if (!obj) {
        return NextResponse.json({ success: false, error: '媒体文件不存在' }, { status: 404 });
      }

      mimeType = obj.httpMetadata?.contentType || 'image/jpeg';
      const bytes = await obj.arrayBuffer();
      base64Data = arrayBufferToBase64(bytes);
    }

    const reverseData = await reversePromptFromMedia(
      base64Data,
      mimeType,
      apiKey,
      selectedModel
    );

    return NextResponse.json({
      success: true,
      mediaPath: savedMediaPath,
      url: `/api/${savedMediaPath}`,
      mimeType,
      data: reverseData,
    });
  } catch (err: any) {
    console.error('Reverse prompt error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
