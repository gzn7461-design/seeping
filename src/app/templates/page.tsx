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

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
    setAiContent('');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">评论模板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理股吧评论模板，支持一键复制和 AI 生成
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
              {aiContent ? (
                <Button onClick={useAiContent}>
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
    </div>
  );
}
