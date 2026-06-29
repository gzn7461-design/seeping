'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListTodo,
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
    scheduled_at: string;
    published_at: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">加载数据失败</div>
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="评论模板"
          value={data.totalTemplates}
          icon={FileText}
          color="default"
        />
        <StatCard
          title="待发布"
          value={data.pendingTasks}
          icon={Clock}
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
          icon={AlertCircle}
          color="danger"
        />
      </div>

      {/* Recent Tasks */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">最近任务</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            共 {data.totalTasks} 个任务
          </span>
        </div>
        <div className="divide-y divide-border">
          {data.recentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mb-3 opacity-50" />
              <p>暂无发布任务</p>
              <p className="text-sm mt-1">创建你的第一个定时发布任务吧</p>
            </div>
          ) : (
            data.recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {task.target_url}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(task.scheduled_at).toLocaleString('zh-CN')}
                  </span>
                  <StatusBadge status={task.status as 'pending' | 'published' | 'failed' | 'cancelled'} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
