import { NextResponse } from 'next/server';
import { createFolderDirectory, getFolderHierarchy } from '@/lib/storage';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { folderName, parentPath } = await request.json();
    if (!folderName || !folderName.trim()) {
      return NextResponse.json({ success: false, error: '目录名称不能为空' }, { status: 400 });
    }

    const cleanName = folderName.replace(/[/\\?%*:|"<>]/g, '_').trim();
    const targetPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    await createFolderDirectory(targetPath);
    const folders = await getFolderHierarchy();

    return NextResponse.json({ success: true, folderPath: targetPath, folders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
