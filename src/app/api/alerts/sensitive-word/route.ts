import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { sensitiveWords as sensitiveWordsTable } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";

// 发送企业微信机器人消息（支持 Markdown）
async function sendWeComMessage(webhook: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content: content,
        },
      }),
    });

    if (!response.ok) {
      console.error("Failed to send WeCom message:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending WeCom message:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment, matchedWords, stockCode, stockName } = body;

    if (!comment || !matchedWords || !stockCode || !stockName) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查找该股票的预警配置
    const { data: configs, error: configError } = await supabase
      .from("alert_configs")
      .select("*")
      .eq("stock_code", stockCode)
      .eq("is_active", "true");

    if (configError) {
      console.error("查询预警配置失败:", configError);
      return NextResponse.json(
        { error: "查询预警配置失败" },
        { status: 500 }
      );
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json(
        { message: "未找到该股票的预警配置", sent: false },
        { status: 200 }
      );
    }

    // 构建预警消息（Markdown 格式）
    const message = `## 🚨 敏感字预警

**股票：** ${stockName} (${stockCode})

**⚠️ 检测到敏感字：** ${matchedWords.join(", ")}

---

**📝 评论内容**

**作者：** ${comment.username}
**标题：** ${comment.title || "无"}
**内容：** ${comment.comment_content}
**时间：** ${comment.comment_time}
**阅读：** ${comment.read_count || 0} | **评论：** ${comment.reply_count || 0}

---

**🔗 来源：** ${comment.source_url || "无"}

**⏰ 预警时间：** ${new Date().toLocaleString("zh-CN")}`;

    // 发送预警到所有配置的企微机器人
    const sendResults = await Promise.all(
      configs.map(async (config) => {
        if (!config.wecom_webhook) return false;
        return sendWeComMessage(config.wecom_webhook, message);
      })
    );

    const sent = sendResults.some((result) => result);

    // 记录预警记录
    const alertRecords = configs.map((config) => ({
      config_id: config.id,
      stock_code: stockCode,
      stock_name: stockName,
      alert_type: "sensitive_word",
      threshold: "0",
      actual_value: matchedWords.length.toString(),
      message: message,
      sent_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("alert_records")
      .insert(alertRecords);

    if (insertError) {
      console.error("插入预警记录失败:", insertError);
    }

    return NextResponse.json({
      success: true,
      sent,
      configCount: configs.length,
      message: sent ? "预警已发送" : "预警发送失败",
    });
  } catch (error) {
    console.error("敏感字预警处理失败:", error);
    return NextResponse.json(
      { error: "敏感字预警处理失败" },
      { status: 500 }
    );
  }
}
