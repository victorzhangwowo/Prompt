import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    success: true,
    isServerless: true,
    message: 'Cloudflare Pages 为 Serverless 无服务器边缘架构，已自动刷新状态，无需手动重启进程。',
  });
}
