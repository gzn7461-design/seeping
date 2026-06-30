'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  X,
  CalendarClock,
  ExternalLink,
  Bell,
  BellOff,
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
  stock_code: string | null;
  stock_name: string | null;
  scheduled_at: string;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface Template {
  id: string;
  title: string;
  content: string;
  stock_code: string | null;
  stock_name: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [nextReminder, setNextReminder] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    target_url: '',
    target_platform: 'eastmoney',
    scheduled_at: '',
    template_id: '',
    stock_code: '',
    stock_name: '',
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

  // Find next pending task for reminder
  useEffect(() => {
    const pendingTasks = tasks
      .filter((t) => t.status === 'pending')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    if (pendingTasks.length > 0) {
      setNextReminder(pendingTasks[0]);
    } else {
      setNextReminder(null);
    }
  }, [tasks]);

  // Reminder notification
  useEffect(() => {
    if (!reminderEnabled || !nextReminder) return;

    const checkReminder = () => {
      const now = new Date();
      const scheduledTime = new Date(nextReminder.scheduled_at);
      const diff = scheduledTime.getTime() - now.getTime();

      // If within 1 minute
      if (diff > 0 && diff < 60000) {
        if (Notification.permission === 'granted') {
          new Notification('CommentHub 提醒', {
            body: `即将发布评论到 ${nextReminder.stock_name || '股吧'}: ${nextReminder.content.slice(0, 50)}...`,
            icon: '/favicon.ico',
          });
        }
      }
    };

    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [reminderEnabled, nextReminder]);

  const enableReminder = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    setReminderEnabled(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    setFormData((prev) => ({ ...prev, template_id: templateId }));
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setFormData((prev) => ({
          ...prev,
          template_id: templateId,
          content: template.content,
          stock_code: template.stock_code || '',
          stock_name: template.stock_name || '',
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
          stock_code: formData.stock_code || null,
          stock_name: formData.stock_name || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
        setFormData({
          content: '',
          target_url: '',
          target_platform: 'eastmoney',
          scheduled_at: '',
          template_id: '',
          stock_code: '',
          stock_name: '',
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

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const getStockBarUrl = (stockCode: string) => {
    return `https://guba.eastmoney.com/list,${stockCode}.html`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">定时发布</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建评论发布任务，到时间提醒你手动发布
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={reminderEnabled ? 'default' : 'outline'}
            onClick={reminderEnabled ? () => setReminderEnabled(false) : enableReminder}
            className={reminderEnabled ? '' : ''}
          >
            {reminderEnabled ? (
              <><Bell className="h-4 w-4 mr-2" />提醒已开启</>
            ) : (
              <><BellOff className="h-4 w-4 mr-2" />开启提醒</>
            )}
          </Button>
          <Button
            onClick={() => {
              setFormData({
                content: '',
                target_url: '',
                target_platform: 'eastmoney',
                scheduled_at: '',
                template_id: '',
                stock_code: '',
                stock_name: '',
              });
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新建任务
          </Button>
        </div>
      </div>

      {/* Next Reminder Banner */}
      {reminderEnabled && nextReminder && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  下一个任务: {nextReminder.stock_name || '股吧'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  计划时间: {new Date(nextReminder.scheduled_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            {nextReminder.stock_code && (
              <a
                href={getStockBarUrl(nextReminder.stock_code)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
              >
                打开股吧
              </a>
            )}
          </div>
        </div>
      )}

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
            创建任务后，到时间会提醒你手动发布
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
                    {task.stock_name && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {task.stock_name}
                        {task.stock_code && (
                          <span className="ml-1 text-blue-500">{task.stock_code}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mb-2">
                    {task.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-48">{task.target_url}</span>
                    </div>
                    {task.stock_code && (
                      <a
                        href={getStockBarUrl(task.stock_code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        打开股吧
                      </a>
                    )}
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
            {/* Stock Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">股票代码</label>
                <Input
                  placeholder="如: 600519"
                  value={formData.stock_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock_code: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">股票名称</label>
                <Input
                  placeholder="如: 贵州茅台"
                  value={formData.stock_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock_name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Template Selection */}
            <div>
              <label className="text-sm font-medium text-foreground">
                从模板选择（可选）
              </label>
              <Select value={formData.template_id} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="选择一个评论模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.stock_name ? `[${t.stock_name}] ` : ''}{t.title}
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
                rows={3}
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="mt-1.5 resize-none"
              />
            </div>

            {/* Target URL */}
            <div>
              <label className="text-sm font-medium text-foreground">
                目标URL <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="https://guba.eastmoney.com/list,600519.html"
                value={formData.target_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, target_url: e.target.value }))}
                className="mt-1.5"
              />
              {formData.stock_code && (
                <p className="text-xs text-muted-foreground mt-1">
                  股吧地址: {getStockBarUrl(formData.stock_code)}
                </p>
              )}
            </div>

            {/* Schedule */}
            <div>
              <label className="text-sm font-medium text-foreground">
                计划时间 <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                min={getMinDateTime()}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.content || !formData.target_url || !formData.scheduled_at}
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
