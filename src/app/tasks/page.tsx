'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  X,
  CalendarClock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';

interface Task {
  id: string;
  template_id: string | null;
  content: string;
  target_url: string;
  target_platform: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  scheduled_at: string;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface Template {
  id: string;
  title: string;
  content: string;
}

const platforms = [
  { value: 'generic', label: '通用' },
  { value: 'weibo', label: '微博' },
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'B站' },
  { value: 'zhihu', label: '知乎' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    content: '',
    target_url: '',
    target_platform: 'generic',
    scheduled_at: '',
    template_id: '',
  });

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

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchTemplates();
  }, [fetchTasks]);

  const handleSelectTemplate = (templateId: string) => {
    setFormData((prev) => ({ ...prev, template_id: templateId }));
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setFormData((prev) => ({
          ...prev,
          template_id: templateId,
          content: template.content,
        }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.content || !formData.target_url || !formData.scheduled_at) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          target_url: formData.target_url,
          target_platform: formData.target_platform,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          template_id: formData.template_id || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
        setFormData({
          content: '',
          target_url: '',
          target_platform: 'generic',
          scheduled_at: '',
          template_id: '',
        });
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;

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

  // Get min datetime for scheduling (current time)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">定时发布</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建和管理评论发布任务
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({
              content: '',
              target_url: '',
              target_platform: 'generic',
              scheduled_at: '',
              template_id: '',
            });
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          新建任务
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {['all', 'pending', 'published', 'failed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {status === 'all' ? '全部' : status === 'pending' ? '待发布' : status === 'published' ? '已发布' : status === 'failed' ? '失败' : '已取消'}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          加载中...
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
          <CalendarClock className="h-12 w-12 mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">暂无发布任务</p>
          <p className="text-sm text-muted-foreground mt-1">
            点击「新建任务」创建定时发布
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={task.status} />
                    <span className="text-xs text-muted-foreground">
                      {platforms.find((p) => p.value === task.target_platform)?.label || task.target_platform}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mb-2">
                    {task.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{task.target_url}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-muted-foreground text-right">
                    <p>计划: {new Date(task.scheduled_at).toLocaleString('zh-CN')}</p>
                    {task.published_at && (
                      <p>实际: {new Date(task.published_at).toLocaleString('zh-CN')}</p>
                    )}
                  </div>
                  {task.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCancel(task.id)}
                        className="rounded-md px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  )}
                  {task.status !== 'pending' && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
              {task.error_message && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                  {task.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>新建发布任务</span>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Template Selection */}
            <div>
              <label className="text-sm font-medium text-foreground">
                从模板选择（可选）
              </label>
              <Select
                value={formData.template_id}
                onValueChange={handleSelectTemplate}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="选择一个评论模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium text-foreground">
                评论内容 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="输入要发布的评论内容..."
                rows={4}
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                className="mt-1.5 resize-none"
              />
            </div>

            {/* Target URL */}
            <div>
              <label className="text-sm font-medium text-foreground">
                目标URL <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="https://example.com/post/123"
                value={formData.target_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target_url: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>

            {/* Platform & Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">目标平台</label>
                <Select
                  value={formData.target_platform}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, target_platform: val }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  计划时间 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  min={getMinDateTime()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduled_at: e.target.value,
                    }))
                  }
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.content || !formData.target_url || !formData.scheduled_at
                }
              >
                创建任务
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
