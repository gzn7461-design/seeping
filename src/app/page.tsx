'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';

interface DashboardData {
  totalTemplates: number;
  totalTasks: number;
  pendingTasks: number;
  publishedTasks: number;
  failedTasks: number;
  recentTasks: Array<{
    id: string;
    content: string;
    target_url: string;
    status: string;
    stock_name: string | null;
    stock_code: string | null;
    scheduled_at: string;
    published_at: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载失败，请刷新页面重试
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          评论管理中心概览
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="评论模板"
          value={data.totalTemplates}
          icon={FileText}
          color="default"
        />
        <StatCard
          title="待发布"
          value={data.pendingTasks}
          icon={CalendarClock}
          color="warning"
        />
        <StatCard
          title="已发布"
          value={data.publishedTasks}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="发布失败"
          value={data.failedTasks}
          icon={XCircle}
          color="danger"
        />
      </div>

      {/* Recent Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">最近任务</h2>
          <a
            href="/tasks"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            查看全部
          </a>
        </div>
        {data.recentTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
            <Sparkles className="h-10 w-10 mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">暂无任务</p>
            <p className="text-sm text-muted-foreground mt-1">
              创建你的第一个发布任务吧
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={task.status as 'pending' | 'published' | 'failed' | 'cancelled'} />
                    {task.stock_name && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {task.stock_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground line-clamp-1">
                    {task.content}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0">
                  {new Date(task.scheduled_at).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
