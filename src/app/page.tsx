'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  CalendarClock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import Link from 'next/link';

interface DashboardData {
  // 评论管理
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
  // 舆情监控
  totalComments: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  // 预警管理
  sensitiveAlerts: number;
  unprocessedAlerts: number;
  alertConfigs: number;
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
          CommentHub 数据概览
        </p>
      </div>

      {/* 评论管理统计 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">评论管理</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/templates">
            <StatCard
              title="评论模板"
              value={data.totalTemplates}
              icon={FileText}
              color="default"
            />
          </Link>
          <Link href="/templates">
            <StatCard
              title="待发布"
              value={data.pendingTasks}
              icon={CalendarClock}
              color="warning"
            />
          </Link>
          <Link href="/templates">
            <StatCard
              title="已发布"
              value={data.publishedTasks}
              icon={CheckCircle2}
              color="success"
            />
          </Link>
          <Link href="/templates">
            <StatCard
              title="发布失败"
              value={data.failedTasks}
              icon={XCircle}
              color="danger"
            />
          </Link>
        </div>
      </div>

      {/* 舆情监控统计 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">舆情监控</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/alerts/center">
            <StatCard
              title="评论总数"
              value={data.totalComments}
              icon={MessageSquare}
              color="default"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="好评"
              value={data.positiveCount}
              icon={ThumbsUp}
              color="success"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="一般"
              value={data.neutralCount}
              icon={Minus}
              color="warning"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="差评"
              value={data.negativeCount}
              icon={ThumbsDown}
              color="danger"
            />
          </Link>
        </div>
      </div>

      {/* 预警管理统计 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">预警管理</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/alerts/center">
            <StatCard
              title="敏感字预警"
              value={data.sensitiveAlerts}
              icon={ShieldAlert}
              color="danger"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="未处理预警"
              value={data.unprocessedAlerts}
              icon={AlertTriangle}
              color="warning"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="预警配置"
              value={data.alertConfigs}
              icon={Bell}
              color="default"
            />
          </Link>
          <Link href="/alerts/center">
            <StatCard
              title="定时任务"
              value={data.totalTasks}
              icon={CalendarClock}
              color="default"
            />
          </Link>
        </div>
      </div>

      {/* 最近任务 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">最近发布任务</h2>
        <div className="bg-card rounded-lg border p-6">
          {data.recentTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">暂无任务</p>
          ) : (
            <div className="space-y-3">
              {data.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {task.stock_name && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {task.stock_name}
                        </span>
                      )}
                      <span className="text-sm truncate max-w-md">
                        {task.content}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      计划: {new Date(task.scheduled_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: '待发布', className: 'bg-yellow-100 text-yellow-800' },
    published: { label: '已发布', className: 'bg-green-100 text-green-800' },
    failed: { label: '失败', className: 'bg-red-100 text-red-800' },
  };

  const { label, className } = config[status] || config.pending;

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
