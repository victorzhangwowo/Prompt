import { NextResponse } from 'next/server';
import { generateTagsFromPrompt } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { prompt, category, apiKey, selectedModel, model } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: '提示词内容不能为空' }, { status: 400 });
    }

    const modelToUse = selectedModel || model;
    const tags = await generateTagsFromPrompt(prompt, category, apiKey, modelToUse);

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (err: any) {
    console.error('Generate tags error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
