"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Upload,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Brain,
  TrendingUp,
  Eye,
  MessageSquare,
  FileText,
  User,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

interface StockComment {
  id: string;
  stock_code: string;
  stock_name: string;
  username: string;
  comment_content: string;
  comment_time: string;
  source_url: string | null;
  sentiment: string;
  sentiment_score: string;
  ai_analysis: string | null;
  read_count?: number;
  reply_count?: number;
  title?: string;
}

interface Stats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export default function MonitorPage() {
  const [comments, setComments] = useState<StockComment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, positive: 0, neutral: 0, negative: 0 });
  const [loading, setLoading] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<StockComment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sentimentFilter !== "all") params.set("sentiment", sentimentFilter);
      
      const res = await fetch(`/api/comments?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        setComments(json.data);
        // 计算统计
        const allComments = json.data;
        setStats({
          total: allComments.length,
          positive: allComments.filter((c: StockComment) => c.sentiment === "positive").length,
          neutral: allComments.filter((c: StockComment) => c.sentiment === "neutral").length,
          negative: allComments.filter((c: StockComment) => c.sentiment === "negative").length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [sentimentFilter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 处理Excel上传
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        alert("Excel文件为空");
        return;
      }

      // 批量上传评论
      const uploadData = jsonData.map((row) => ({
        stock_code: String(row["股票代码"] || row["stock_code"] || ""),
        stock_name: String(row["股票名称"] || row["stock_name"] || ""),
        username: String(row["作者"] || row["username"] || row["作者"] || "匿名用户"),
        comment_content: String(row["评论内容"] || row["content"] || row["评论"] || ""),
        comment_time: String(row["最后更新"] || row["time"] || row["时间"] || new Date().toISOString()),
        source_url: String(row["链接"] || row["url"] || row["source_url"] || ""),
        read_count: Number(row["阅读"] || row["read_count"] || 0),
        reply_count: Number(row["评论"] || row["reply_count"] || 0),
        title: String(row["标题"] || row["title"] || ""),
      }));

      const res = await fetch("/api/comments/batch-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: uploadData }),
      });
      const json = await res.json();

      if (json.success) {
        alert(`成功上传 ${json.data.uploaded} 条评论`);
        fetchComments();
      } else {
        alert(json.error || "上传失败");
      }
    } catch (error) {
      console.error("Failed to upload Excel:", error);
      alert("上传失败，请检查文件格式");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 一键分析当天舆论
  const handleAnalyzeAll = async () => {
    if (comments.length === 0) {
      alert("暂无评论数据");
      return;
    }

    setAnalyzingAll(true);
    try {
      // 获取今天的评论
      const today = new Date().toISOString().split("T")[0];
      const todayComments = comments.filter((c) => {
        const commentDate = new Date(c.comment_time).toISOString().split("T")[0];
        return commentDate === today;
      });

      if (todayComments.length === 0) {
        alert("今天暂无评论数据");
        return;
      }

      // 批量分析
      const res = await fetch("/api/comments/batch-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_ids: todayComments.map((c) => c.id),
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert(`成功分析 ${json.data.analyzed} 条评论`);
        fetchComments();
      } else {
        alert(json.error || "分析失败");
      }
    } catch (error) {
      console.error("Failed to analyze all comments:", error);
      alert("分析失败");
    } finally {
      setAnalyzingAll(false);
    }
  };

  const handleAnalyze = async (commentId: string) => {
    setAnalyzingId(commentId);
    try {
      const res = await fetch("/api/comments/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
      const json = await res.json();
      
      if (json.success) {
        // 更新本地状态
        setComments(prev => prev.map(c => c.id === commentId ? json.data : c));
      } else {
        alert(json.error || "分析失败");
      }
    } catch (error) {
      console.error("Failed to analyze comment:", error);
      alert("分析失败");
    } finally {
      setAnalyzingId(null);
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Badge className="bg-green-100 text-green-700 border-green-200"><ThumbsUp className="h-3 w-3 mr-1" />好评</Badge>;
      case "negative":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><ThumbsDown className="h-3 w-3 mr-1" />差评</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><Minus className="h-3 w-3 mr-1" />一般</Badge>;
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1e293b]">舆情监控</h1>
          <p className="text-sm text-gray-500 mt-1">上传评论数据，AI 分析情感倾向</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总评论</p>
                <p className="text-xl font-semibold text-[#1e293b]">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">好评</p>
                <p className="text-xl font-semibold text-green-600">{stats.positive}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Minus className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">一般</p>
                <p className="text-xl font-semibold text-gray-600">{stats.neutral}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">差评</p>
                <p className="text-xl font-semibold text-red-600">{stats.negative}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作栏 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3 items-center">
              {/* Excel上传 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-[#1e293b] hover:bg-[#334155]"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    上传Excel
                  </>
                )}
              </Button>

              {/* 一键分析 */}
              <Button
                onClick={handleAnalyzeAll}
                disabled={analyzingAll || comments.length === 0}
                variant="outline"
              >
                {analyzingAll ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    一键分析当天舆论
                  </>
                )}
              </Button>

              {/* 刷新 */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchComments}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>

              {/* 情感筛选 */}
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="positive">好评</SelectItem>
                  <SelectItem value="neutral">一般</SelectItem>
                  <SelectItem value="negative">差评</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 评论列表 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">评论列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无评论数据，请上传Excel文件
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">阅读</TableHead>
                    <TableHead className="w-[80px]">评论</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead className="w-[120px]">作者</TableHead>
                    <TableHead className="w-[120px]">最后更新</TableHead>
                    <TableHead className="w-[80px]">情感</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Eye className="h-3 w-3" />
                          {comment.read_count || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MessageSquare className="h-3 w-3" />
                          {comment.reply_count || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {comment.title || comment.comment_content}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {comment.username}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(comment.comment_time)}
                        </div>
                      </TableCell>
                      <TableCell>{getSentimentBadge(comment.sentiment)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedComment(comment)}
                          >
                            详情
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAnalyze(comment.id)}
                            disabled={analyzingId === comment.id}
                          >
                            {analyzingId === comment.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Brain className="h-3 w-3" />
                            )}
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

        {/* 评论详情弹窗 */}
        <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>评论详情</DialogTitle>
            </DialogHeader>
            {selectedComment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">作者</Label>
                    <p className="font-medium">{selectedComment.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">股票</Label>
                    <p className="font-medium">{selectedComment.stock_name} ({selectedComment.stock_code})</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">阅读</Label>
                    <p className="font-medium">{selectedComment.read_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">评论数</Label>
                    <p className="font-medium">{selectedComment.reply_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">最后更新</Label>
                    <p className="font-medium">{new Date(selectedComment.comment_time).toLocaleString("zh-CN")}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">情感分类</Label>
                    <div className="mt-1">{getSentimentBadge(selectedComment.sentiment)}</div>
                  </div>
                </div>
                {selectedComment.title && (
                  <div>
                    <Label className="text-sm text-gray-500">标题</Label>
                    <p className="mt-1 font-medium">{selectedComment.title}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-gray-500">评论内容</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{selectedComment.comment_content}</p>
                </div>
                {selectedComment.source_url && (
                  <div>
                    <Label className="text-sm text-gray-500">评论链接</Label>
                    <a
                      href={selectedComment.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {selectedComment.source_url}
                    </a>
                  </div>
                )}
                {selectedComment.ai_analysis && (
                  <div>
                    <Label className="text-sm text-gray-500">AI 分析</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedComment.ai_analysis}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
