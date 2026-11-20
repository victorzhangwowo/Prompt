import { NextResponse } from 'next/server';
import { fetchAvailableModels } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ success: false, error: '请先提供 API Key' }, { status: 400 });
    }

    const models = await fetchAvailableModels(apiKey.trim());

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (err: any) {
    console.error('Fetch models error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
