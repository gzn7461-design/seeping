'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CalendarClock,
  History,
  MessageSquare,
  TrendingUp,
  Bell,
  Building2,
  ShieldAlert,
  Activity,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/templates', label: '评论模板', icon: FileText },
  { href: '/tasks', label: '定时发布', icon: CalendarClock },
  { href: '/history', label: '发布历史', icon: History },
  { href: '/monitor', label: '舆情监控', icon: TrendingUp },
  { href: '/alerts', label: '预警管理', icon: Bell },
  { href: '/alerts/center', label: '预警中心', icon: Activity },
  { href: '/stocks', label: '股票管理', icon: Building2 },
  { href: '/sensitive-words', label: '敏感字库', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-card transition-transform">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">CommentHub</h1>
            <p className="text-xs text-muted-foreground">评论管理中心</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground text-center">
            CommentHub v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
