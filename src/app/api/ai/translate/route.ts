import { NextResponse } from 'next/server';
import { translatePromptWithGemini } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { text, targetLang, apiKey, selectedModel, model } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: '翻译内容不能为空' }, { status: 400 });
    }

    const modelToUse = selectedModel || model;
    const translation = await translatePromptWithGemini(text, targetLang || 'en', apiKey, modelToUse);
    return NextResponse.json({ success: true, translation });
  } catch (err: any) {
    console.error('Translation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
