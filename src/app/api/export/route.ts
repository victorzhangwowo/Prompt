import { NextResponse } from 'next/server';
import { getAllPrompts } from '@/lib/storage';

export const runtime = 'edge';

export async function GET() {
  try {
    const prompts = await getAllPrompts();
    const backupData = {
      exportTime: new Date().toISOString(),
      version: '2.0-cloudflare',
      totalCount: prompts.length,
      prompts,
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="myprompt-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
