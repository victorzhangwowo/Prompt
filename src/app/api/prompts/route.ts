import { NextResponse } from 'next/server';
import { getAllPrompts, savePromptFile, getFolderHierarchy } from '@/lib/storage';
import { PromptItem } from '@/types/prompt';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();
    const model = searchParams.get('model');
    const folder = searchParams.get('folder');

    const allPrompts = await getAllPrompts();
    let prompts = allPrompts;

    if (category && category !== 'all') {
      prompts = prompts.filter((p) => p.category === category);
    }

    if (folder) {
      prompts = prompts.filter(
        (p) => p.folderPath === folder || p.folderPath.startsWith(`${folder}/`)
      );
    }

    if (model) {
      prompts = prompts.filter((p) =>
        p.models.some((m) => m.toLowerCase().includes(model.toLowerCase()))
      );
    }

    if (search) {
      prompts = prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.promptEn.toLowerCase().includes(search) ||
          p.promptZh.toLowerCase().includes(search) ||
          p.tags.some((t) => t.toLowerCase().includes(search)) ||
          p.models.some((m) => m.toLowerCase().includes(search))
      );
    }

    const folders = await getFolderHierarchy(allPrompts);

    return NextResponse.json({
      success: true,
      prompts,
      folders,
      totalCount: prompts.length,
    });
  } catch (err: any) {
    console.error('Error fetching prompts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, oldFilePath } = body as { prompt: PromptItem; oldFilePath?: string };

    if (!prompt.title || !prompt.title.trim()) {
      return NextResponse.json({ success: false, error: '标题不能为空' }, { status: 400 });
    }

    const saved = await savePromptFile(prompt, oldFilePath);
    return NextResponse.json({ success: true, prompt: saved });
  } catch (err: any) {
    console.error('Error saving prompt:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
