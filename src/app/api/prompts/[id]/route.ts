import { NextResponse } from 'next/server';
import { deletePromptFile } from '@/lib/storage';

export const runtime = 'edge';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json({ success: false, error: '缺少 filePath 参数' }, { status: 400 });
    }

    const ok = await deletePromptFile(filePath);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
