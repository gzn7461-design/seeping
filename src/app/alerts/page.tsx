"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Activity,
} from "lucide-react";

interface AlertConfig {
  id: string;
  stock_code: string;
  stock_name: string;
  negative_threshold: string;
  wecom_webhook: string;
  is_active: string;
  created_at: string;
}

interface AlertRecord {
  id: string;
  stock_code: string;
  stock_name: string;
  alert_type: string;
  threshold: string;
  actual_value: string;
  message: string;
  sent_at: string;
}

export default function AlertsPage() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    stock_code: "",
    stock_name: "",
    negative_threshold: "30",
    wecom_webhook: "",
  });

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/configs");
      const json = await res.json();
      if (json.success) {
        setConfigs(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch configs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleCreate = async () => {
    if (!formData.stock_code || !formData.stock_name || !formData.wecom_webhook) {
      alert("请填写完整信息");
      return;
    }

    try {
      const res = await fetch("/api/alerts/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        setDialogOpen(false);
        setFormData({
          stock_code: "",
          stock_name: "",
          negative_threshold: "30",
          wecom_webhook: "",
        });
        fetchConfigs();
      } else {
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create config:", error);
      alert("创建失败");
    }
  };

  const handleCheckAlerts = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_check: true }),
      });
      const json = await res.json();

      if (json.success) {
        const alerts = json.data.alerts || [];
        if (alerts.length > 0) {
          alert(`触发 ${alerts.length} 条预警`);
        } else {
          alert("检查完成，未触发预警");
        }
      } else {
        alert(json.error || "检查失败");
      }
    } catch (error) {
      console.error("Failed to check alerts:", error);
      alert("检查失败");
    } finally {
      setChecking(false);
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e293b]">预警管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              配置差评阈值，超过阈值自动通过企业微信机器人推送预警
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/alerts/center">
              <Button variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                预警中心
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleCheckAlerts}
              disabled={checking}
            >
              {checking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              检查预警
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e293b] hover:bg-[#334155]">
                  <Plus className="h-4 w-4 mr-2" />
                  添加配置
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加预警配置</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">
                        股票代码
                      </Label>
                      <Input
                        placeholder="如 600519"
                        value={formData.stock_code}
                        onChange={(e) =>
                          setFormData({ ...formData, stock_code: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">
                        股票名称
                      </Label>
                      <Input
                        placeholder="如 贵州茅台"
                        value={formData.stock_name}
                        onChange={(e) =>
                          setFormData({ ...formData, stock_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      差评阈值（%）
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="差评占比超过此值触发预警"
                      value={formData.negative_threshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          negative_threshold: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      当差评占比超过此百分比时触发预警
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      企业微信机器人 Webhook
                    </Label>
                    <Input
                      placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                      value={formData.wecom_webhook}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wecom_webhook: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      在企业微信群中添加机器人后获取 Webhook 地址
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    className="bg-[#1e293b] hover:bg-[#334155]"
                    onClick={handleCreate}
                  >
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 配置列表 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">预警配置</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>暂无预警配置</p>
                <p className="text-sm mt-1">点击"添加配置"创建第一个预警规则</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>股票</TableHead>
                    <TableHead>差评阈值</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.stock_name}
                        <span className="text-gray-400 ml-1 text-sm">
                          ({config.stock_code})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          {config.negative_threshold}%
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-gray-500">
                        {config.wecom_webhook}
                      </TableCell>
                      <TableCell>
                        {config.is_active === "true" ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            启用
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            停用
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatTime(config.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="bg-white rounded-xl border-0 shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2">
              <span className="text-[#1e293b] font-medium">1.</span>
              <p>
                在企业微信群中添加机器人，获取 Webhook 地址。路径：群设置 → 群机器人 → 添加机器人 → 复制 Webhook 地址
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-[#1e293b] font-medium">2.</span>
              <p>
                添加预警配置，设置股票代码和差评阈值。建议阈值设置为 20%-40%
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-[#1e293b] font-medium">3.</span>
              <p>
                在"舆情监控"页面采集评论后，点击"检查预警"会检查最近 24 小时的评论数据
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-[#1e293b] font-medium">4.</span>
              <p>
                当差评占比超过阈值时，会自动向企业微信群发送预警消息
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
