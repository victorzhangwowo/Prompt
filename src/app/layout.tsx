import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyPrompt - AI 提示词管理与多模态反向工作台',
  description: '专业的 AI 提示词整理、中英互译与 Google Gemini 多模态反推管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased select-none">
        {children}
      </body>
    </html>
  );
}
