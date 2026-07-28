import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

async function sendWeComMessage(webhook: string, content: string) {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: { content },
    }),
  });
  if (!res.ok) {
    throw new Error(`企业微信机器人推送失败: ${res.status}`);
  }
  return await res.json();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();

    // 获取所有活跃的预警配置
    const { data: configs, error: configError } = await supabase
      .from("alert_configs")
      .select("*")
      .eq("is_active", "true");

    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有活跃的预警配置" },
        { status: 400 }
      );
    }

    const results = [];

    // 为每个配置发送测试消息
    for (const config of configs) {
      if (!config.wecom_webhook) continue;

      const testMessage = `## 🧪 CommentHub 预警机器人测试报告

📅 ${new Date().toLocaleString("zh-CN")} | ✅ 自动测试

---

### 🟢 设备状态

 **机器人连接** ✅ 已连接

---

### 📋 系统概览

📊 **股票：** ${config.stock_name} (${config.stock_code})

📈 **预警类型：** ${config.alert_types || "差评预警"}

️ **差评阈值：** ${config.negative_threshold}%

---

### 🔍 端口详情

✅ **差评预警：** 已配置
✅ **敏感词预警：** 已配置
✅ **未处理预警：** 已配置

---

⚡ CommentHub × 预警机器人自动测试`;

      try {
        await sendWeComMessage(config.wecom_webhook, testMessage);
        results.push({
          stock_code: config.stock_code,
          stock_name: config.stock_name,
          success: true,
        });
      } catch (error) {
        results.push({
          stock_code: config.stock_code,
          stock_name: config.stock_name,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `测试完成，共发送 ${results.filter((r) => r.success).length} 条消息`,
    });
  } catch (error) {
    console.error("预警测试失败:", error);
    return NextResponse.json(
      { success: false, error: "测试失败" },
      { status: 500 }
    );
  }
}
