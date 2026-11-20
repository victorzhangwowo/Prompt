import { NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const valid = await verifyCredentials(username, password);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(username);
    const isHttps = request.url.startsWith('https://');

    const response = NextResponse.json({
      success: true,
      username,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || '登录请求异常' },
      { status: 500 }
    );
  }
}
