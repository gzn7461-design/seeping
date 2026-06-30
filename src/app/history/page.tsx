'use client';

import { useEffect, useState, useCallback } from 'react';
import { History as HistoryIcon, ExternalLink, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Task {
  id: string;
  content: string;
  target_url: string;
  target_platform: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  stock_code: string | null;
  stock_name: string | null;
  scheduled_at: string;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('pageSize', '50');

      const res = await fetch(`/api/tasks?${params}`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getStockBarUrl = (stockCode: string) => {
    return `https://guba.eastmoney.com/list,${stockCode}.html`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">发布历史</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看所有发布任务记录
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待发布</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* History List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          加载中...
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <HistoryIcon className="h-12 w-12 mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">暂无发布记录</p>
          <p className="text-sm text-muted-foreground mt-1">
            创建发布任务后，记录将显示在这里
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  股票
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  评论内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  计划时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    {task.stock_name ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{task.stock_name}</p>
                        {task.stock_code && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-muted-foreground">{task.stock_code}</span>
                            <a
                              href={getStockBarUrl(task.stock_code)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-foreground line-clamp-2 max-w-xs">
                        {task.content}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-40">{task.target_url}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">
                      <p>{new Date(task.scheduled_at).toLocaleDateString('zh-CN')}</p>
                      <p className="text-xs">{new Date(task.scheduled_at).toLocaleTimeString('zh-CN')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
