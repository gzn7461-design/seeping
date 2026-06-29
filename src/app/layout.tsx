import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: {
    default: 'CommentHub - 评论管理中心',
    template: '%s | CommentHub',
  },
  description: '评论模板管理与定时发布工具，高效管理社交媒体评论',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased bg-background text-foreground`}>
        {isDev && <Inspector />}
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-60 flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
