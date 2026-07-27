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
  Download,
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
  BarChart3,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

type TimeRange = "day" | "month" | "quarter" | "half" | "year";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [timeRange, setTimeRange] = useState<string>("day"); // day, month, quarter, half, year
  const [chartCategory, setChartCategory] = useState<string>("all"); // all, positive, neutral, negative
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStock, setSelectedStock] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [customDate, setCustomDate] = useState<string>("");
  const [uploadStockCode, setUploadStockCode] = useState<string>("");
  const [stocks, setStocks] = useState<Array<{ id: string; stock_code: string; stock_name: string }>>([]);
  const pageSize = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      // 获取统计数据（不受分页影响）
      const statsParams = new URLSearchParams();
      if (selectedStock !== "all") statsParams.set("stock_code", selectedStock);
      if (dateFilter === "custom" && customDate) {
        statsParams.set("date", customDate);
      } else if (dateFilter !== "all" && dateFilter !== "custom") {
        statsParams.set("date", dateFilter);
      }
      
      const statsRes = await fetch(`/api/comments/stats?${statsParams.toString()}`);
      const statsJson = await statsRes.json();
      
      if (statsJson.success) {
        setStats(statsJson.data);
      }
      
      // 获取分页数据
      const params = new URLSearchParams();
      if (sentimentFilter !== "all") params.set("sentiment", sentimentFilter);
      if (selectedStock !== "all") params.set("stock_code", selectedStock);
      if (dateFilter === "custom" && customDate) {
        params.set("date", customDate);
      } else if (dateFilter !== "all" && dateFilter !== "custom") {
        params.set("date", dateFilter);
      }
      params.set("page", currentPage.toString());
      params.set("pageSize", pageSize.toString());
      
      const res = await fetch(`/api/comments?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        setComments(json.data);
        setTotalPages(json.pagination?.totalPages || 0);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [sentimentFilter, selectedStock, dateFilter, currentPage]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments, currentPage]);

  // 加载股票列表
  const loadStocks = useCallback(async () => {
    try {
      const response = await fetch("/api/stocks");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStocks(result.data);
        }
      }
    } catch (error) {
      console.error("加载股票列表失败:", error);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  // 下载Excel模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "阅读": 1234,
        "评论数量": 56,
        "主评论": "茅台今天走势分析",
        "作者": "股市老手",
        "最后更新": "2025-07-02 15:30:00",
      },
      {
        "阅读": 890,
        "评论数量": 23,
        "主评论": "五粮液基本面分析",
        "作者": "价值投资者",
        "最后更新": "2025-07-02 14:20:00",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "评论数据");
    XLSX.writeFile(wb, "评论数据模板.xlsx");
  };

  // 处理Excel上传
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查是否选择了股票
    if (!uploadStockCode) {
      alert("请先选择股票后再上传Excel文件");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

      console.log("Excel解析结果:", jsonData);
      console.log("第一行数据:", jsonData[0]);
      console.log("列名:", Object.keys(jsonData[0] || {}));

      if (jsonData.length === 0) {
        alert("Excel文件为空");
        return;
      }

      // 批量上传评论 - 支持多种列名映射
      const uploadData = jsonData.map((row) => {
        // 尝试多种可能的列名
        const stockCode = String(row["股票代码"] || row["stock_code"] || row["代码"] || uploadStockCode || "");
        const stockName = String(row["股票名称"] || row["stock_name"] || row["名称"] || (uploadStockCode ? stocks.find(s => s.stock_code === uploadStockCode)?.stock_name || "" : ""));
        const username = String(row["作者"] || row["username"] || row["用户名"] || "匿名用户");
        const title = String(row["主评论"] || row["标题"] || row["title"] || row["帖子标题"] || "");
        const commentContent = String(row["评论内容"] || row["content"] || row["评论"] || title);
        const commentTime = String(row["最后更新"] || row["time"] || row["时间"] || row["更新时间"] || new Date().toISOString());
        const sourceUrl = String(row["链接"] || row["url"] || row["source_url"] || row["来源"] || "");
        const readCount = Number(row["阅读"] || row["read_count"] || row["阅读量"] || 0);
        const replyCount = Number(row["评论数量"] || row["评论"] || row["reply_count"] || row["回复"] || 0);

        return {
          stock_code: stockCode,
          stock_name: stockName,
          username: username,
          comment_content: commentContent,
          comment_time: commentTime,
          source_url: sourceUrl,
          read_count: readCount,
          reply_count: replyCount,
          title: title,
        };
      });

      console.log("上传数据:", uploadData);

      const res = await fetch("/api/comments/batch-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: uploadData }),
      });
      const json = await res.json();

      console.log("上传响应:", json);

      if (json.success) {
        alert(`成功上传 ${json.data.uploaded} 条评论`);
        setCurrentPage(1); // 重置到第一页
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

  // 单条AI分析
  const handleAnalyzeSingle = async (commentId: string) => {
    setAnalyzingId(commentId);
    try {
      const res = await fetch("/api/comments/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
      const json = await res.json();

      if (json.success) {
        // 更新当前评论
        if (selectedComment?.id === commentId) {
          setSelectedComment({
            ...selectedComment,
            sentiment: json.data.sentiment,
            sentiment_score: json.data.sentiment_score,
            ai_analysis: json.data.ai_analysis,
          });
        }
        // 刷新评论列表
        fetchComments();
      } else {
        alert(json.error || "分析失败");
      }
    } catch (error) {
      console.error("Failed to analyze comment:", error);
      alert("分析失败，请稍后重试");
    } finally {
      setAnalyzingId(null);
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

  const handleSentimentChange = async (commentId: string, newSentiment: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentiment: newSentiment }),
      });
      const json = await res.json();
      
      if (json.success) {
        // 更新本地状态
        setComments(prev =>
          prev.map(c => c.id === commentId ? { ...c, sentiment: newSentiment } : c)
        );
        // 刷新评论列表
        await fetchComments();
      } else {
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("更新情感标签失败:", error);
      alert("更新失败，请重试");
    }
  };

  // 图表数据处理
  const processChartData = useCallback(() => {
    // 按时间范围分组统计
    const grouped: Record<string, { positive: number; neutral: number; negative: number }> = {};
    
    comments.forEach((comment) => {
      const date = new Date(comment.comment_time);
      let key: string;
      
      switch (timeRange) {
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "half":
          const half = date.getMonth() < 6 ? "H1" : "H2";
          key = `${date.getFullYear()}-${half}`;
          break;
        case "year":
          key = `${date.getFullYear()}`;
          break;
        default: // day
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { positive: 0, neutral: 0, negative: 0 };
      }
      
      if (comment.sentiment === "positive") grouped[key].positive++;
      else if (comment.sentiment === "neutral") grouped[key].neutral++;
      else if (comment.sentiment === "negative") grouped[key].negative++;
    });
    
    const chartData = Object.entries(grouped)
      .map(([date, counts]) => ({
        date,
        positive: counts.positive,
        neutral: counts.neutral,
        negative: counts.negative,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    setChartData(chartData);
  }, [comments, timeRange]);

  useEffect(() => {
    processChartData();
  }, [processChartData]);

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

        {/* 可视化图表 */}
        {chartData.length > 0 && (
          <Card className="bg-white rounded-xl border-0 shadow-sm mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">舆情趋势分析</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={chartCategory} onValueChange={setChartCategory}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="positive">好评</SelectItem>
                      <SelectItem value="neutral">一般</SelectItem>
                      <SelectItem value="negative">差评</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">按天</SelectItem>
                      <SelectItem value="month">按月</SelectItem>
                      <SelectItem value="quarter">按季度</SelectItem>
                      <SelectItem value="half">按半年</SelectItem>
                      <SelectItem value="year">按年度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {(chartCategory === "all" || chartCategory === "positive") && (
                      <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="好评" />
                    )}
                    {(chartCategory === "all" || chartCategory === "neutral") && (
                      <Line type="monotone" dataKey="neutral" stroke="#9ca3af" strokeWidth={2} dot={{ r: 4 }} name="一般" />
                    )}
                    {(chartCategory === "all" || chartCategory === "negative") && (
                      <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="差评" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作栏 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3 items-center flex-wrap">
              {/* 股票选择 */}
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="选择股票" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部股票</SelectItem>
                  {stocks.map((stock) => (
                    <SelectItem key={stock.id} value={stock.stock_code}>
                      {stock.stock_code} - {stock.stock_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 日期选择 */}
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCustomDate(""); }}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">近7天</SelectItem>
                  <SelectItem value="month">近30天</SelectItem>
                  <SelectItem value="custom">自定义日期</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectContent>
              </Select>

              {/* 自定义日期选择 */}
              {dateFilter === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
              )}

              {/* 股票选择 */}
              <Select
                value={uploadStockCode}
                onValueChange={setUploadStockCode}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择股票" />
                </SelectTrigger>
                <SelectContent>
                  {stocks.map((stock) => (
                    <SelectItem key={stock.stock_code} value={stock.stock_code}>
                      {stock.stock_code} - {stock.stock_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              {/* 下载模板 */}
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                下载模板
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
                  <SelectItem value="all">全部情感</SelectItem>
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
                    <TableHead className="w-[70px]">阅读</TableHead>
                    <TableHead className="w-[70px]">评论数</TableHead>
                    <TableHead>主评论</TableHead>
                    <TableHead className="w-[100px]">情感</TableHead>
                    <TableHead className="w-[100px]">作者</TableHead>
                    <TableHead className="w-[90px]">股票</TableHead>
                    <TableHead className="w-[140px]">最后更新</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow
                      key={comment.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedComment(comment)}
                    >
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
                      <TableCell className="text-sm">
                        <div className="max-w-[300px] truncate" title={comment.comment_content || comment.title}>
                          {comment.comment_content || comment.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={comment.sentiment || "neutral"}
                            onValueChange={(value) => handleSentimentChange(comment.id, value)}
                          >
                            <SelectTrigger className={`h-7 w-20 text-xs border-0 ${
                              comment.sentiment === 'positive' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                              comment.sentiment === 'negative' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                              'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}>
                              <div className="flex items-center gap-1">
                                {comment.sentiment === 'positive' && <ThumbsUp className="h-3 w-3" />}
                                {comment.sentiment === 'negative' && <ThumbsDown className="h-3 w-3" />}
                                {(!comment.sentiment || comment.sentiment === 'neutral') && <Minus className="h-3 w-3" />}
                                <span>{comment.sentiment === 'positive' ? '好评' : comment.sentiment === 'negative' ? '差评' : '一般'}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="positive">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="h-3 w-3 text-green-600" />
                                  <span className="text-green-700">好评</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="neutral">
                                <div className="flex items-center gap-1">
                                  <Minus className="h-3 w-3 text-gray-600" />
                                  <span className="text-gray-700">一般</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="negative">
                                <div className="flex items-center gap-1">
                                  <ThumbsDown className="h-3 w-3 text-red-600" />
                                  <span className="text-red-700">差评</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 truncate max-w-[80px]" title={comment.username}>
                          <User className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="truncate">{comment.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-xs" title={`${comment.stock_code} ${comment.stock_name}`}>
                          <div className="font-medium">{comment.stock_code || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(comment.comment_time)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-gray-500">
                  共 {totalCount} 条评论，第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
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
                {selectedComment.comment_content && (
                  <div>
                    <Label className="text-sm text-gray-500">主评论</Label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">{selectedComment.comment_content}</p>
                  </div>
                )}
                {selectedComment.title && selectedComment.title !== selectedComment.comment_content && (
                  <div>
                    <Label className="text-sm text-gray-500">原标题</Label>
                    <p className="mt-1 font-medium">{selectedComment.title}</p>
                  </div>
                )}
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
                {selectedComment.ai_analysis ? (
                  <div>
                    <Label className="text-sm text-gray-500">AI 分析过程</Label>
                    <div className="mt-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      {(() => {
                        try {
                          const analysis = JSON.parse(selectedComment.ai_analysis);
                          return (
                            <div className="space-y-4">
                              {/* 分析对象 */}
                              <div>
                                <span className="text-sm font-medium text-gray-700">📋 分析对象：</span>
                                <p className="mt-1 text-sm text-gray-600">{selectedComment.stock_name} ({selectedComment.stock_code}) - {selectedComment.comment_content || selectedComment.title}</p>
                              </div>
                              {/* 情感判断 */}
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-700">🎯 情感判断：</span>
                                {getSentimentBadge(analysis.sentiment)}
                                {analysis.sentiment_label && (
                                  <span className="text-sm text-gray-500">({analysis.sentiment_label})</span>
                                )}
                              </div>
                              {/* 评分 */}
                              {selectedComment.sentiment_score && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">📊 情感评分：</span>
                                  <div className="mt-1 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${
                                          analysis.sentiment === 'positive' ? 'bg-green-500' : 
                                          analysis.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}
                                        style={{ width: `${Math.abs(parseFloat(selectedComment.sentiment_score) || 0) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{selectedComment.sentiment_score}</span>
                                  </div>
                                </div>
                              )}
                              {/* 判断依据 */}
                              {analysis.reason && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700"> 判断依据：</span>
                                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{analysis.reason}</p>
                                </div>
                              )}
                              {/* 关键词 */}
                              {analysis.keywords && analysis.keywords.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">🏷️ 关键词：</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {analysis.keywords.map((kw: string, i: number) => (
                                      <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-blue-600 border border-blue-200">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* 投资建议 */}
                              {analysis.suggestion && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">💡 投资建议：</span>
                                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{analysis.suggestion}</p>
                                </div>
                              )}
                            </div>
                          );
                        } catch {
                          return <pre className="text-sm whitespace-pre-wrap">{selectedComment.ai_analysis}</pre>;
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm text-gray-500">AI 分析</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <p className="text-sm text-gray-500 mb-3">该评论尚未进行AI分析</p>
                      <Button
                        onClick={() => handleAnalyzeSingle(selectedComment.id)}
                        disabled={analyzingId === selectedComment.id}
                        size="sm"
                      >
                        {analyzingId === selectedComment.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            分析中...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            开始AI分析
                          </>
                        )}
                      </Button>
                    </div>
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
