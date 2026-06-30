"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Brain,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

interface StockComment {
  id: string;
  stock_code: string;
  stock_name: string;
  username: string;
  comment_content: string;
  comment_time: string;
  sentiment: string;
  sentiment_score: string;
  ai_analysis: string | null;
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
  const [collecting, setCollecting] = useState(false);
  const [stockCode, setStockCode] = useState("");
  const [stockName, setStockName] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<StockComment | null>(null);

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

  const handleCollect = async () => {
    if (!stockCode) return;
    
    setCollecting(true);
    try {
      const res = await fetch("/api/collect-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_code: stockCode,
          stock_name: stockName || "未知股票",
          page_size: 30,
        }),
      });
      const json = await res.json();
      
      if (json.success) {
        alert(`成功采集 ${json.data.collected} 条评论`);
        fetchComments();
        setStockCode("");
        setStockName("");
      } else {
        alert(json.error || "采集失败");
      }
    } catch (error) {
      console.error("Failed to collect comments:", error);
      alert("采集失败");
    } finally {
      setCollecting(false);
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
          <p className="text-sm text-gray-500 mt-1">采集东方财富股吧评论，AI 分析情感倾向</p>
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

        {/* 采集操作 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">采集评论</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-sm text-gray-600 mb-1 block">股票代码</Label>
                <Input
                  placeholder="如 600519"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-gray-600 mb-1 block">股票名称</Label>
                <Input
                  placeholder="如 贵州茅台"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                onClick={handleCollect}
                disabled={collecting || !stockCode}
                className="h-9 bg-[#1e293b] hover:bg-[#334155]"
              >
                {collecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    采集中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    采集
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 评论列表 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">评论列表</CardTitle>
            <div className="flex gap-2">
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="positive">好评</SelectItem>
                  <SelectItem value="neutral">一般</SelectItem>
                  <SelectItem value="negative">差评</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchComments}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无评论数据，请先采集评论
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>评论内容</TableHead>
                    <TableHead>股票</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>情感</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell className="font-medium text-sm">{comment.username}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {comment.comment_content}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-gray-600">{comment.stock_name}</span>
                        <span className="text-gray-400 ml-1">({comment.stock_code})</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatTime(comment.comment_time)}
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
                    <Label className="text-sm text-gray-500">用户</Label>
                    <p className="font-medium">{selectedComment.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">股票</Label>
                    <p className="font-medium">{selectedComment.stock_name} ({selectedComment.stock_code})</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">评论时间</Label>
                    <p className="font-medium">{new Date(selectedComment.comment_time).toLocaleString("zh-CN")}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">情感分类</Label>
                    <div className="mt-1">{getSentimentBadge(selectedComment.sentiment)}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">评论内容</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{selectedComment.comment_content}</p>
                </div>
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
