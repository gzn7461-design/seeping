'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarClock,
  History,
  FileText,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  stock_code: string | null;
  stock_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  template_id: string;
  content: string;
  target_url: string;
  target_platform: string;
  status: string;
  stock_code: string | null;
  stock_name: string | null;
  scheduled_at: string;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface PublishHistory {
  id: string;
  template_id: string;
  content: string;
  target_url: string;
  target_platform: string;
  status: string;
  stock_code: string | null;
  stock_name: string | null;
  scheduled_at: string;
  published_at: string;
  error_message: string | null;
  created_at: string;
}

const categories = [
  { value: 'all', label: '全部分类' },
  { value: 'general', label: '通用' },
  { value: 'bullish', label: '看多' },
  { value: 'bearish', label: '看空' },
  { value: 'analysis', label: '分析' },
  { value: 'news', label: '资讯' },
];

const sentiments = [
  { value: 'bullish', label: '看多', icon: TrendingUp },
  { value: 'bearish', label: '看空', icon: TrendingDown },
  { value: 'neutral', label: '中性', icon: Minus },
];

const styles = [
  { value: 'discussion', label: '讨论交流' },
  { value: 'analysis', label: '专业分析' },
  { value: 'short', label: '简短有力' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<PublishHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiForm, setAiForm] = useState({
    stock_code: '',
    stock_name: '',
    sentiment: 'neutral',
    style: 'discussion',
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    stock_code: '',
    stock_name: '',
  });

  // Task form
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    template_id: '',
    target_url: '',
    target_platform: 'eastmoney',
    scheduled_at: '',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('search', search);

      const res = await fetch(`/api/templates?${params}`);
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const json = await res.json();
      if (json.success) {
        setTasks(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks?status=published');
      const json = await res.json();
      if (json.success) {
        setHistory(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchTasks();
    fetchHistory();
  }, [fetchTemplates, fetchTasks, fetchHistory]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({ title: '', content: '', category: 'general', tags: '', stock_code: '', stock_name: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      content: template.content,
      category: template.category,
      tags: template.tags || '',
      stock_code: template.stock_code || '',
      stock_name: template.stock_name || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) return;

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiForm.stock_name) return;

    setAiGenerating(true);
    setAiContent(''); // Clear previous content before generating

    try {
      const res = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      });

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setAiContent((prev) => prev + parsed.content);
              }
              if (parsed.error) {
                console.error('AI generation error:', parsed.error);
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate comment:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const useAiContent = () => {
    setFormData((prev) => ({
      ...prev,
      content: aiContent,
      title: `${aiForm.stock_name} - ${sentiments.find(s => s.value === aiForm.sentiment)?.label || ''}评论`,
      stock_code: aiForm.stock_code,
      stock_name: aiForm.stock_name,
    }));
    setAiDialogOpen(false);
    setAiContent('');
    if (!dialogOpen) {
      setDialogOpen(true);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.template_id || !taskForm.scheduled_at) {
      alert('请选择模板和设置发布时间');
      return;
    }

    const template = templates.find(t => t.id === taskForm.template_id);
    if (!template) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: taskForm.template_id,
          content: template.content,
          target_url: taskForm.target_url,
          target_platform: taskForm.target_platform,
          scheduled_at: taskForm.scheduled_at,
          stock_code: template.stock_code,
          stock_name: template.stock_name,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('定时任务创建成功');
        setTaskDialogOpen(false);
        fetchTasks();
      } else {
        alert(json.error || '创建失败');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('创建失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />待发布</Badge>;
      case 'published':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />已发布</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">评论管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理评论模板、定时发布任务和发布历史
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setAiForm({ stock_code: '', stock_name: '', sentiment: 'neutral', style: 'discussion' }); setAiContent(''); setAiDialogOpen(true); }}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI 生成
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新建模板
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            评论模板
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CalendarClock className="h-4 w-4 mr-2" />
            定时发布
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            发布历史
          </TabsTrigger>
        </TabsList>

        {/* 评论模板 */}
        <TabsContent value="templates" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索模板、股票代码或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template List */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <Sparkles className="h-12 w-12 mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">暂无模板</p>
              <p className="text-sm text-muted-foreground mt-1">
                点击「AI 生成」快速创建，或「新建模板」手动添加
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1">
                      {template.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={() => handleCopy(template.content, template.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
                        title="复制内容"
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditDialog(template)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setTaskForm({
                            template_id: template.id,
                            target_url: '',
                            target_platform: 'eastmoney',
                            scheduled_at: '',
                          });
                          setTaskDialogOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                        title="创建定时任务"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stock Info */}
                  {template.stock_name && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {template.stock_name}
                        {template.stock_code && (
                          <span className="ml-1 text-blue-500">{template.stock_code}</span>
                        )}
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {template.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {categories.find((c) => c.value === template.category)?.label || template.category}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 定时发布 */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>定时发布任务</CardTitle>
                  <CardDescription>管理待发布的定时任务</CardDescription>
                </div>
                <Button onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建任务
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无定时任务
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          {task.stock_name && (
                            <span className="text-sm font-medium">
                              {task.stock_name} ({task.stock_code})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          计划：{formatTime(task.scheduled_at)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {task.content}
                      </div>
                      {task.target_url && (
                        <div className="text-xs text-muted-foreground">
                          目标：{task.target_url}
                        </div>
                      )}
                      {task.error_message && (
                        <div className="text-xs text-red-600">
                          错误：{task.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发布历史 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>发布历史</CardTitle>
              <CardDescription>查看已发布的评论记录</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无发布记录
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item.status)}
                          {item.stock_name && (
                            <span className="text-sm font-medium">
                              {item.stock_name} ({item.stock_code})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          发布：{formatTime(item.published_at)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {item.content}
                      </div>
                      {item.target_url && (
                        <div className="text-xs text-muted-foreground">
                          目标：{item.target_url}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editingTemplate ? '编辑模板' : '新建模板'}</span>
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

            <div>
              <label className="text-sm font-medium text-foreground">模板标题</label>
              <Input
                placeholder="输入模板标题"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">评论内容</label>
              <Textarea
                placeholder="输入评论内容..."
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                className="mt-1.5 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">分类</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.value !== 'all').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">标签</label>
                <Input
                  placeholder="用逗号分隔"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.title || !formData.content}>
                {editingTemplate ? '保存修改' : '创建模板'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI 生成评论
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">股票代码</label>
                <Input
                  placeholder="如: 600519"
                  value={aiForm.stock_code}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, stock_code: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">股票名称 <span className="text-red-500">*</span></label>
                <Input
                  placeholder="如: 贵州茅台"
                  value={aiForm.stock_name}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, stock_name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">情绪倾向</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {sentiments.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setAiForm((prev) => ({ ...prev, sentiment: s.value }))}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      aiForm.sentiment === s.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">语言风格</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setAiForm((prev) => ({ ...prev, style: s.value }))}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      aiForm.style === s.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Content */}
            {aiContent && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground mb-1">生成结果:</p>
                <p className="text-sm text-foreground">{aiContent}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                取消
              </Button>
              {aiContent && (
                <Button
                  variant="outline"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiGenerating ? '重新生成中...' : '重新生成'}
                </Button>
              )}
              {aiContent ? (
                <Button onClick={useAiContent} disabled={aiGenerating}>
                  <Check className="h-4 w-4 mr-2" />
                  使用此内容
                </Button>
              ) : (
                <Button onClick={handleAiGenerate} disabled={!aiForm.stock_name || aiGenerating}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiGenerating ? '生成中...' : '生成评论'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-500" />
              创建定时发布任务
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground">选择模板</label>
              <Select
                value={taskForm.template_id}
                onValueChange={(val) => setTaskForm((prev) => ({ ...prev, template_id: val }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="请选择模板" />
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

            <div>
              <label className="text-sm font-medium text-foreground">目标 URL</label>
              <Input
                placeholder="如: https://guba.eastmoney.com/..."
                value={taskForm.target_url}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, target_url: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">目标平台</label>
              <Select
                value={taskForm.target_platform}
                onValueChange={(val) => setTaskForm((prev) => ({ ...prev, target_platform: val }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eastmoney">东方财富股吧</SelectItem>
                  <SelectItem value="xueqiu">雪球</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">计划发布时间</label>
              <Input
                type="datetime-local"
                value={taskForm.scheduled_at}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTask}>
                <Send className="h-4 w-4 mr-2" />
                创建任务
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
