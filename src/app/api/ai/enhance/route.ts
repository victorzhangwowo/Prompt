import { NextResponse } from 'next/server';
import { enhancePromptWithGemini } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { prompt, category, targetModel, apiKey, selectedModel, model } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: '输入提示词不能为空' }, { status: 400 });
    }

    const modelToUse = selectedModel || model;
    const enhanced = await enhancePromptWithGemini(
      prompt,
      category || '文生图',
      targetModel || 'Midjourney',
      apiKey,
      modelToUse
    );

    return NextResponse.json({ success: true, ...enhanced });
  } catch (err: any) {
    console.error('Enhance prompt error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
