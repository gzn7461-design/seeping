"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Bell, MessageSquare, TrendingUp, Shield, Clock, Activity, Plus, Upload, BarChart3, Calendar, Send, Edit, Trash2, Download } from "lucide-react";
import Link from "next/link";

interface AlertRecord {
  id: string;
  config_id: string;
  stock_code: string;
  stock_name: string;
  alert_type: string;
  threshold: string;
  actual_value: string;
  message: string;
  sent_at: string;
  created_at: string;
}

interface AlertConfig {
  id: string;
  stock_code: string;
  stock_name: string;
  negative_threshold: string;
  check_interval?: string;
  wecom_webhook: string;
  alert_types?: string;
  is_active: string;
  created_at: string;
}

interface SensitiveWordAlert {
  id: string;
  stock_code: string;
  stock_name: string;
  username: string;
  comment_content: string;
  sensitive_words: string;
  comment_time: string;
  created_at: string;
}

interface Stock {
  id: string;
  stock_code: string;
  stock_name: string;
  created_at: string;
}

interface Comment {
  id: string;
  stock_code: string;
  stock_name: string;
  title: string;
  username: string;
  comment_content: string;
  comment_time: string;
  source_url: string;
  read_count: number;
  reply_count: number;
  sentiment: string;
  sentiment_score: number;
  ai_analysis: any;
  has_sensitive_words: string;
  sensitive_words: string;
  is_processed: string;
  collected_at: string;
  created_at: string;
}

export default function AlertsCenterPage() {
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [sensitiveAlerts, setSensitiveAlerts] = useState<SensitiveWordAlert[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  const [stats, setStats] = useState({
    totalAlerts: 0,
    todayAlerts: 0,
    activeConfigs: 0,
    sensitiveWordAlerts: 0,
    totalComments: 0,
    negativeComments: 0,
  });

  // 预警配置表单
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({
    stock_code: "",
    stock_name: "",
    negative_threshold: "30",
    check_interval: "30",
    wecom_webhook: "",
    alert_types: ["negative", "sensitive_word"],
  });

  // 评论上传
  const [uploadStockCode, setUploadStockCode] = useState("");
  const [uploadStockName, setUploadStockName] = useState("");

  // 评论详情
  const [showCommentDetail, setShowCommentDetail] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  useEffect(() => {
    fetchAlertData();
    fetchStocks();
    fetchComments(1);
  }, []);

  const fetchAlertData = async () => {
    try {
      setLoading(true);

      // 获取预警记录
      const recordsRes = await fetch("/api/alerts/records");
      const recordsData = await recordsRes.json();
      if (recordsData.success) {
        setAlertRecords(recordsData.data || []);
      }

      // 获取预警配置
      const configsRes = await fetch("/api/alerts/configs");
      const configsData = await configsRes.json();
      if (configsData.success) {
        setAlertConfigs(configsData.data || []);
      }

      // 获取敏感字预警
      const sensitiveRes = await fetch("/api/alerts/sensitive-records");
      const sensitiveData = await sensitiveRes.json();
      if (sensitiveData.success) {
        setSensitiveAlerts(sensitiveData.data || []);
      }

      // 计算统计数据
      const today = new Date().toDateString();
      const todayAlerts = (recordsData.data || []).filter(
        (r: AlertRecord) => new Date(r.sent_at).toDateString() === today
      ).length;

      const activeConfigs = (configsData.data || []).filter(
        (c: AlertConfig) => c.is_active === "true"
      ).length;

      setStats({
        totalAlerts: (recordsData.data || []).length,
        todayAlerts,
        activeConfigs,
        sensitiveWordAlerts: (sensitiveData.data || []).length,
        totalComments: 0,
        negativeComments: 0,
      });
    } catch (error) {
      console.error("获取预警数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      if (data.success) {
        setStocks(data.data || []);
      }
    } catch (error) {
      console.error("获取股票列表失败:", error);
    }
  };

  const fetchComments = async (page = 1) => {
    try {
      // 获取今日的数据
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const res = await fetch(`/api/comments?page=${page}&pageSize=${pageSize}&date=${startDate.toISOString()}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data || []);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        const negativeCount = (data.data || []).filter((c: Comment) => c.sentiment === "negative").length;
        setStats(prev => ({
          ...prev,
          totalComments: data.pagination?.total || 0,
          negativeComments: negativeCount,
        }));
      }
    } catch (error) {
      console.error("获取评论失败:", error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const url = editingConfigId ? `/api/alerts/configs/${editingConfigId}` : "/api/alerts/configs";
      const method = editingConfigId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...configForm,
          alert_types: configForm.alert_types.join(","),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(editingConfigId ? "预警配置更新成功" : "预警配置保存成功");
        setShowConfigDialog(false);
        setEditingConfigId(null);
        fetchAlertData();
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存预警配置失败:", error);
      alert("保存失败");
    }
  };

  const handleEditConfig = (config: AlertConfig) => {
    setEditingConfigId(config.id);
    setConfigForm({
      stock_code: config.stock_code,
      stock_name: config.stock_name,
      negative_threshold: config.negative_threshold,
      check_interval: config.check_interval || "30",
      wecom_webhook: config.wecom_webhook,
      alert_types: config.alert_types ? config.alert_types.split(",") : ["negative", "sensitive_word"],
    });
    setShowConfigDialog(true);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm("确定要删除这个预警配置吗？")) {
      return;
    }
    try {
      const res = await fetch(`/api/alerts/configs/${configId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("预警配置删除成功");
        fetchAlertData();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除预警配置失败:", error);
      alert("删除失败");
    }
  };

  const toggleConfigStatus = async (config: AlertConfig) => {
    try {
      const newStatus = config.is_active === "true" ? "false" : "true";
      const res = await fetch(`/api/alerts/configs/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_code: config.stock_code,
          stock_name: config.stock_name,
          negative_threshold: config.negative_threshold,
          check_interval: config.check_interval || "30",
          wecom_webhook: config.wecom_webhook,
          alert_types: config.alert_types,
          is_active: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // 直接更新本地状态，避免触发 re-render 循环
        setAlertConfigs((prev) =>
          prev.map((c) => (c.id === config.id ? { ...c, is_active: newStatus } : c))
        );
      }
    } catch (error) {
      console.error("切换状态失败:", error);
    }
  };

  const handleStockSelect = (stockCode: string) => {
    const stock = stocks.find(s => s.stock_code === stockCode);
    if (stock) {
      setConfigForm({
        ...configForm,
        stock_code: stock.stock_code,
        stock_name: stock.stock_name,
      });
    }
  };

  const handleUploadStockSelect = (stockCode: string) => {
    const stock = stocks.find(s => s.stock_code === stockCode);
    if (stock) {
      setUploadStockCode(stock.stock_code);
      setUploadStockName(stock.stock_name);
    }
  };

  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case "negative_threshold":
        return <Badge variant="destructive">差评预警</Badge>;
      case "sensitive_word":
        return <Badge variant="secondary">敏感字预警</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">好评</Badge>;
      case "neutral":
        return <Badge variant="secondary">一般</Badge>;
      case "negative":
        return <Badge variant="destructive">差评</Badge>;
      default:
        return <Badge variant="outline">未分析</Badge>;
    }
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString("zh-CN");
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadStockCode) {
      alert("请先选择股票");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("stock_code", uploadStockCode);
    formData.append("stock_name", uploadStockName);

    try {
      const res = await fetch("/api/comments/batch-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        let msg = `成功上传 ${data.data.uploaded} 条评论`;
        if (data.data.duplicate > 0) {
          msg += `，发现并更新 ${data.data.duplicate} 条重复评论`;
        }
        if (data.data.sensitiveCount > 0) {
          msg += `，其中 ${data.data.sensitiveCount} 条包含敏感字`;
        }
        alert(msg);
        fetchComments(1);
        fetchAlertData();
      } else {
        alert(data.error || "上传失败");
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传失败");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/comments/template");
      if (!response.ok) throw new Error("下载失败");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "评论数据导入模板.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载模板失败:", error);
      alert("下载模板失败");
    }
  };

  const handleAnalyzeAll = async () => {
    try {
      // 获取所有未分析的评论ID
      const unanalyzedIds = comments
        .filter((c) => !c.sentiment || c.sentiment === "neutral")
        .map((c) => c.id);

      if (unanalyzedIds.length === 0) {
        alert("没有需要分析的评论");
        return;
      }

      const res = await fetch("/api/comments/batch-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_ids: unanalyzedIds }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`成功分析 ${data.data.length} 条评论`);
        fetchComments(1);
        fetchAlertData();
      } else {
        alert(data.error || "分析失败");
      }
    } catch (error) {
      console.error("分析失败:", error);
      alert("分析失败");
    }
  };

  const handleProcessComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("已标记为已处理");
        fetchComments(1);
      } else {
        alert(data.error || "处理失败");
      }
    } catch (error) {
      console.error("处理失败:", error);
      alert("处理失败");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？此操作不可恢复。")) {
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("删除成功");
        fetchComments(1);
        fetchAlertData();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败");
    }
  };

  const handleTestAlert = async () => {
    if (!confirm("确定要发送预警测试消息吗？将向所有活跃配置的企业微信机器人发送测试消息。")) {
      return;
    }

    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "测试消息发送完成");
      } else {
        alert(data.error || "测试失败");
      }
    } catch (error) {
      console.error("测试失败:", error);
      alert("测试失败");
    }
  };

  // 定时检查未处理的差评和敏感词（根据配置的间隔时间）
  useEffect(() => {
    const checkUnprocessed = async () => {
      try {
        await fetch("/api/alerts/check-unprocessed", {
          method: "POST",
        });
      } catch (error) {
        console.error("定时检查失败:", error);
      }
    };

    // 立即执行一次
    checkUnprocessed();

    // 获取最小间隔（分钟），默认30分钟
    const intervals = alertConfigs
      .filter((c) => c.is_active === "true")
      .map((c) => parseInt(c.check_interval || "30"))
      .filter((v) => !isNaN(v) && v >= 5);
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 30;

    // 按配置的间隔执行
    const interval = setInterval(checkUnprocessed, minInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [alertConfigs]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">预警中心</h1>
          <p className="text-gray-500 mt-1">统一管理舆情监控、预警配置和评论发布</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAlertData} variant="outline">
            刷新数据
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总预警数</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">累计预警记录</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日预警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAlerts}</div>
            <p className="text-xs text-muted-foreground">今日触发预警</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃配置</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeConfigs}</div>
            <p className="text-xs text-muted-foreground">预警配置数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">敏感字预警</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sensitiveWordAlerts}</div>
            <p className="text-xs text-muted-foreground">敏感字触发次数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">评论总数</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <p className="text-xs text-muted-foreground">已导入评论</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">差评数量</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.negativeComments}</div>
            <p className="text-xs text-muted-foreground">负面评论</p>
          </CardContent>
        </Card>
      </div>

      {/* 功能导航 */}
      <Card>
        <CardHeader>
          <CardTitle>功能导航</CardTitle>
          <CardDescription>快速访问相关功能模块</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/sensitive-words">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <Shield className="h-8 w-8 text-red-500 mb-2" />
                  <div className="font-medium">敏感字库</div>
                  <div className="text-sm text-gray-500">管理敏感词汇</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/stocks">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                  <div className="font-medium">股票管理</div>
                  <div className="text-sm text-gray-500">管理监控股票</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/templates">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <MessageSquare className="h-8 w-8 text-blue-500 mb-2" />
                  <div className="font-medium">评论管理</div>
                  <div className="text-sm text-gray-500">模板与发布</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
                  <div className="font-medium">数据仪表盘</div>
                  <div className="text-sm text-gray-500">数据统计分析</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">舆情监控</TabsTrigger>
          <TabsTrigger value="alerts">预警配置</TabsTrigger>
          <TabsTrigger value="records">预警记录</TabsTrigger>
        </TabsList>

        {/* 舆情监控 */}
        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>评论数据</CardTitle>
                  <CardDescription>上传 Excel 文件导入评论数据</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Select value={uploadStockCode} onValueChange={handleUploadStockSelect}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择股票" />
                      </SelectTrigger>
                      <SelectContent>
                        {stocks.map((stock) => (
                          <SelectItem key={stock.id} value={stock.stock_code}>
                            {stock.stock_name} ({stock.stock_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAnalyzeAll} variant="outline">
                    一键分析
                  </Button>
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    下载模板
                  </Button>
                  <Button asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      上传 Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleExcelUpload}
                      />
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无评论数据</div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedComment(comment);
                        setShowCommentDetail(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSentimentBadge(comment.sentiment)}
                          {comment.has_sensitive_words === "true" && (
                            <Badge variant="destructive">敏感</Badge>
                          )}
                          <span className="font-medium">
                            {comment.stock_name} ({comment.stock_code})
                          </span>
                          <span className="text-sm text-gray-500">
                            {comment.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {formatTime(comment.comment_time)}
                          </span>
                          {(comment.sentiment === "negative" || comment.has_sensitive_words === "true") && comment.is_processed !== "true" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcessComment(comment.id);
                              }}
                            >
                              标记已处理
                            </Button>
                          )}
                          {comment.is_processed === "true" && (
                            <Badge variant="secondary">已处理</Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteComment(comment.id);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {comment.comment_content}
                      </div>
                      {comment.sensitive_words && (
                        <div className="text-xs text-red-600">
                          敏感字：{comment.sensitive_words}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 分页控件 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        共 {totalCount} 条，第 {currentPage}/{totalPages} 页
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => fetchComments(currentPage - 1)}
                        >
                          上一页
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const start = Math.max(1, currentPage - 2);
                          const pageNum = start + i;
                          if (pageNum > totalPages) return null;
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentPage ? "default" : "outline"}
                              size="sm"
                              className="min-w-[36px]"
                              onClick={() => fetchComments(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => fetchComments(currentPage + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 预警配置 */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>预警配置</CardTitle>
                  <CardDescription>配置差评阈值，超过阈值自动通过企业微信机器人推送预警</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestAlert}>
                    <Send className="h-4 w-4 mr-2" />
                    测试机器人
                  </Button>
                  <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        添加配置
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>添加预警配置</DialogTitle>
                      <DialogDescription>
                        配置差评阈值，超过阈值自动推送企业微信机器人通知
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>股票</Label>
                        <Select value={configForm.stock_code} onValueChange={handleStockSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择股票" />
                          </SelectTrigger>
                          <SelectContent>
                            {stocks.map((stock) => (
                              <SelectItem key={stock.id} value={stock.stock_code}>
                                {stock.stock_name} ({stock.stock_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>差评阈值 (%)</Label>
                        <Input
                          type="number"
                          value={configForm.negative_threshold}
                          onChange={(e) => setConfigForm({ ...configForm, negative_threshold: e.target.value })}
                          placeholder="如 30"
                        />
                        <p className="text-sm text-gray-500">
                          当差评占比超过此百分比时触发预警
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>检查间隔（分钟）</Label>
                        <Input
                          type="number"
                          min="5"
                          max="1440"
                          value={configForm.check_interval}
                          onChange={(e) => setConfigForm({ ...configForm, check_interval: e.target.value })}
                          placeholder="如 30"
                        />
                        <p className="text-sm text-gray-500">
                          每隔多少分钟自动检查一次未处理的差评和敏感词（最小 5 分钟，最大 1440 分钟）
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>企业微信机器人 Webhook</Label>
                        <Input
                          value={configForm.wecom_webhook}
                          onChange={(e) => setConfigForm({ ...configForm, wecom_webhook: e.target.value })}
                          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                        />
                        <p className="text-sm text-gray-500">
                          在企业微信群中添加机器人后获取 Webhook 地址
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>预警类型</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="alert_negative"
                              checked={configForm.alert_types.includes("negative")}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setConfigForm({
                                    ...configForm,
                                    alert_types: [...configForm.alert_types, "negative"],
                                  });
                                } else {
                                  setConfigForm({
                                    ...configForm,
                                    alert_types: configForm.alert_types.filter((t) => t !== "negative"),
                                  });
                                }
                              }}
                            />
                            <label htmlFor="alert_negative" className="text-sm">
                              差评预警（差评占比超过阈值）
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="alert_sensitive"
                              checked={configForm.alert_types.includes("sensitive_word")}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setConfigForm({
                                    ...configForm,
                                    alert_types: [...configForm.alert_types, "sensitive_word"],
                                  });
                                } else {
                                  setConfigForm({
                                    ...configForm,
                                    alert_types: configForm.alert_types.filter((t) => t !== "sensitive_word"),
                                  });
                                }
                              }}
                            />
                            <label htmlFor="alert_sensitive" className="text-sm">
                              敏感字预警（检测到敏感字）
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                          取消
                        </Button>
                        <Button onClick={handleSaveConfig}>保存</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
            <CardContent>
              {alertConfigs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无预警配置</div>
              ) : (
                <div className="space-y-4">
                  {alertConfigs.map((config) => (
                    <div key={config.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={config.is_active === "true"}
                            onCheckedChange={() => toggleConfigStatus(config)}
                          />
                          <span className="font-medium">
                            {config.stock_name} ({config.stock_code})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            阈值：{config.negative_threshold}%
                          </span>
                          <span className="text-sm text-gray-400">|</span>
                          <span className="text-sm text-gray-500">
                            间隔：{config.check_interval || "30"}分钟
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditConfig(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConfig(config.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Webhook：{config.wecom_webhook.substring(0, 50)}...
                      </div>
                      {config.alert_types && (
                        <div className="flex gap-2">
                          {config.alert_types.split(",").map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type === "negative" ? "差评预警" : type === "sensitive_word" ? "敏感字预警" : type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="records" className="space-y-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">全部预警</TabsTrigger>
              <TabsTrigger value="sensitive">敏感字预警</TabsTrigger>
              <TabsTrigger value="negative">差评预警</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>预警记录</CardTitle>
                  <CardDescription>所有预警触发记录</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">加载中...</div>
                  ) : alertRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无预警记录</div>
                  ) : (
                    <div className="space-y-4">
                      {alertRecords.slice(0, 20).map((record) => (
                        <div key={record.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getAlertTypeBadge(record.alert_type)}
                              <span className="font-medium">
                                {record.stock_name} ({record.stock_code})
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatTime(record.sent_at)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 whitespace-pre-wrap">
                            {record.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sensitive" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>敏感字预警</CardTitle>
                  <CardDescription>检测到敏感字的评论预警</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">加载中...</div>
                  ) : sensitiveAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">暂无敏感字预警</div>
                  ) : (
                    <div className="space-y-4">
                      {sensitiveAlerts.slice(0, 20).map((alert) => (
                        <div key={alert.id} className="border border-red-200 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">敏感字</Badge>
                              <span className="font-medium">
                                {alert.stock_name} ({alert.stock_code})
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatTime(alert.created_at)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">作者：</span>
                            {alert.username}
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">敏感字：</span>
                            <Badge variant="secondary">{alert.sensitive_words}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="text-gray-500">内容：</span>
                            {alert.comment_content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="negative" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>差评预警</CardTitle>
                  <CardDescription>差评比例超过阈值的预警</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">加载中...</div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      差评预警记录将显示在这里
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* 评论详情弹窗 */}
      <Dialog open={showCommentDetail} onOpenChange={setShowCommentDetail}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>评论详情</DialogTitle>
          </DialogHeader>
          {selectedComment && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">作者</div>
                  <div className="font-medium">{selectedComment.username}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">股票</div>
                  <div className="font-medium">
                    {selectedComment.stock_name} ({selectedComment.stock_code})
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">评论时间</div>
                  <div className="font-medium">
                    {formatTime(selectedComment.comment_time)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">情感分类</div>
                  <div className="mt-1">
                    {getSentimentBadge(selectedComment.sentiment)}
                  </div>
                </div>
              </div>

              {/* 主评论 */}
              <div>
                <div className="text-sm text-gray-500 mb-2">主评论</div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {selectedComment.comment_content}
                </div>
              </div>

              {/* 敏感字信息 */}
              {selectedComment.has_sensitive_words === "true" && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">敏感字</div>
                  <Badge variant="destructive">{selectedComment.sensitive_words}</Badge>
                </div>
              )}

              {/* AI分析 */}
              {selectedComment.ai_analysis && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">AI分析</div>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    {(() => {
                      let analysis: any = selectedComment.ai_analysis;
                      if (typeof analysis === "string") {
                        try {
                          analysis = JSON.parse(analysis);
                        } catch {
                          return <div className="text-sm whitespace-pre-wrap">{analysis}</div>;
                        }
                      }
                      return (
                        <>
                          {/* 情感判断 */}
                          {analysis.sentiment_label && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 font-medium">情感判断：</span>
                              <Badge
                                variant={
                                  analysis.sentiment_label === "positive"
                                    ? "default"
                                    : analysis.sentiment_label === "negative"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {analysis.sentiment_label === "positive"
                                  ? "好评"
                                  : analysis.sentiment_label === "negative"
                                  ? "差评"
                                  : "一般"}
                              </Badge>
                            </div>
                          )}
                          {/* 情感评分 */}
                          {analysis.sentiment_score !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 font-medium">情感评分：</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        analysis.sentiment_score > 0.7
                                          ? "bg-green-500"
                                          : analysis.sentiment_score > 0.4
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                      style={{ width: `${analysis.sentiment_score * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {(analysis.sentiment_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* 分析依据 */}
                          {analysis.reason && (
                            <div>
                              <div className="text-xs text-gray-600 font-medium mb-1">分析依据：</div>
                              <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                {analysis.reason}
                              </div>
                            </div>
                          )}
                          {/* 关键词 */}
                          {analysis.keywords && Array.isArray(analysis.keywords) && analysis.keywords.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 font-medium mb-1">关键词：</div>
                              <div className="flex flex-wrap gap-1">
                                {analysis.keywords.map((keyword: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* 投资建议 */}
                          {analysis.suggestion && (
                            <div>
                              <div className="text-xs text-gray-600 font-medium mb-1">投资建议：</div>
                              <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                {analysis.suggestion}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 处理状态 */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  {selectedComment.is_processed === "true" ? (
                    <Badge variant="secondary">已处理</Badge>
                  ) : (
                    <Badge variant="outline">未处理</Badge>
                  )}
                </div>
                {(selectedComment.sentiment === "negative" ||
                  selectedComment.has_sensitive_words === "true") &&
                  selectedComment.is_processed !== "true" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleProcessComment(selectedComment.id);
                        setShowCommentDetail(false);
                      }}
                    >
                      标记已处理
                    </Button>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
