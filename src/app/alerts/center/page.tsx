"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bell, MessageSquare, TrendingUp, Shield, Clock, Activity } from "lucide-react";
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
  wecom_webhook: string;
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

export default function AlertsCenterPage() {
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [sensitiveAlerts, setSensitiveAlerts] = useState<SensitiveWordAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    todayAlerts: 0,
    activeConfigs: 0,
    sensitiveWordAlerts: 0,
  });

  useEffect(() => {
    fetchAlertData();
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
      });
    } catch (error) {
      console.error("获取预警数据失败:", error);
    } finally {
      setLoading(false);
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

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString("zh-CN");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">预警中心</h1>
          <p className="text-gray-500 mt-1">统一管理舆情预警、敏感字监控和定时发布</p>
        </div>
        <Button onClick={fetchAlertData} variant="outline">
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* 功能导航 */}
      <Card>
        <CardHeader>
          <CardTitle>功能导航</CardTitle>
          <CardDescription>快速访问相关功能模块</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/monitor">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <TrendingUp className="h-8 w-8 text-blue-500 mb-2" />
                  <div className="font-medium">舆情监控</div>
                  <div className="text-sm text-gray-500">评论分析与统计</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/alerts">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <Bell className="h-8 w-8 text-orange-500 mb-2" />
                  <div className="font-medium">预警管理</div>
                  <div className="text-sm text-gray-500">配置预警规则</div>
                </CardContent>
              </Card>
            </Link>

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
          </div>
        </CardContent>
      </Card>

      {/* 预警记录 */}
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
    </div>
  );
}
