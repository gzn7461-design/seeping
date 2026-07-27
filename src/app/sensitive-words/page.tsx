"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  ShieldAlert,
  Search,
  RefreshCw,
} from "lucide-react";

interface SensitiveWord {
  id: string;
  word: string;
  category: string;
  level: string;
  is_active: string;
  created_at: string;
}

export default function SensitiveWordsPage() {
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null);
  const [formData, setFormData] = useState({
    word: "",
    category: "general",
    level: "medium",
  });

  const fetchWords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }
      params.set("is_active", "true");

      const res = await fetch(`/api/sensitive-words?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setWords(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch sensitive words:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, [categoryFilter]);

  const handleCreate = async () => {
    if (!formData.word.trim()) {
      alert("请输入敏感字");
      return;
    }

    try {
      const res = await fetch("/api/sensitive-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        setDialogOpen(false);
        setFormData({ word: "", category: "general", level: "medium" });
        fetchWords();
      } else {
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create sensitive word:", error);
      alert("创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个敏感字吗？")) return;

    try {
      const res = await fetch(`/api/sensitive-words/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        fetchWords();
      } else {
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete sensitive word:", error);
      alert("删除失败");
    }
  };

  const handleEdit = (word: SensitiveWord) => {
    setEditingWord(word);
    setFormData({
      word: word.word,
      category: word.category,
      level: word.level,
    });
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingWord) return;

    try {
      const res = await fetch(`/api/sensitive-words/${editingWord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        setDialogOpen(false);
        setEditingWord(null);
        setFormData({ word: "", category: "general", level: "medium" });
        fetchWords();
      } else {
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Failed to update sensitive word:", error);
      alert("更新失败");
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-100 text-red-700 border-red-200">高</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">中</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-700 border-green-200">低</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: "通用",
      political: "政治",
      pornographic: "色情",
      violent: "暴力",
      advertising: "广告",
      spam: "垃圾信息",
    };
    return labels[category] || category;
  };

  const filteredWords = words.filter((w) =>
    w.word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 ml-60 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1e293b] flex items-center gap-2">
                <ShieldAlert className="h-6 w-6" />
                敏感字库管理
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                管理敏感字库，自动检测评论中的敏感内容
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingWord(null);
                setFormData({ word: "", category: "general", level: "medium" });
                setDialogOpen(true);
              }}
              className="bg-[#1e293b] hover:bg-[#334155]"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加敏感字
            </Button>
          </div>

          {/* 筛选和搜索 */}
          <Card className="bg-white rounded-xl border-0 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索敏感字..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="分类筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="general">通用</SelectItem>
                    <SelectItem value="political">政治</SelectItem>
                    <SelectItem value="pornographic">色情</SelectItem>
                    <SelectItem value="violent">暴力</SelectItem>
                    <SelectItem value="advertising">广告</SelectItem>
                    <SelectItem value="spam">垃圾信息</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={fetchWords}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  刷新
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 敏感字列表 */}
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                敏感字列表 ({filteredWords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : filteredWords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无敏感字数据，请点击"添加敏感字"按钮添加
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>敏感字</TableHead>
                      <TableHead className="w-[120px]">分类</TableHead>
                      <TableHead className="w-[100px]">级别</TableHead>
                      <TableHead className="w-[180px]">创建时间</TableHead>
                      <TableHead className="w-[120px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWords.map((word) => (
                      <TableRow key={word.id}>
                        <TableCell className="font-medium">{word.word}</TableCell>
                        <TableCell>{getCategoryLabel(word.category)}</TableCell>
                        <TableCell>{getLevelBadge(word.level)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(word.created_at).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(word)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(word.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 添加/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWord ? "编辑敏感字" : "添加敏感字"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>敏感字</Label>
                <Input
                  value={formData.word}
                  onChange={(e) =>
                    setFormData({ ...formData, word: e.target.value })
                  }
                  placeholder="请输入敏感字"
                />
              </div>
              <div>
                <Label>分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">通用</SelectItem>
                    <SelectItem value="political">政治</SelectItem>
                    <SelectItem value="pornographic">色情</SelectItem>
                    <SelectItem value="violent">暴力</SelectItem>
                    <SelectItem value="advertising">广告</SelectItem>
                    <SelectItem value="spam">垃圾信息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>级别</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={editingWord ? handleUpdate : handleCreate}
                className="bg-[#1e293b] hover:bg-[#334155]"
              >
                {editingWord ? "更新" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
