import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 获取所有活跃的预警配置
    const { data: configs, error: configError } = await supabase
      .from("alert_configs")
      .select("*")
      .eq("is_active", "true");

    if (configError || !configs) {
      return NextResponse.json(
        { success: false, error: "获取预警配置失败" },
        { status: 500 }
      );
    }

    const alerts = [];

    for (const config of configs) {
      // 获取该股票最近的未处理差评
      const { data: negativeComments, error: negError } = await supabase
        .from("stock_comments")
        .select("*")
        .eq("stock_code", config.stock_code)
        .eq("sentiment", "negative")
        .eq("is_processed", "false")
        .order("created_at", { ascending: false })
        .limit(10);

      if (negError) continue;

      // 获取该股票最近的未处理敏感词评论
      const { data: sensitiveComments, error: sensError } = await supabase
        .from("stock_comments")
        .select("*")
        .eq("stock_code", config.stock_code)
        .eq("has_sensitive_words", "true")
        .eq("is_processed", "false")
        .order("created_at", { ascending: false })
        .limit(10);

      if (sensError) continue;

      // 发送差评预警
      if (negativeComments && negativeComments.length > 0) {
        const webhook = config.wecom_webhook;
        if (webhook) {
          const message = {
            msgtype: "markdown",
            markdown: {
              content: `## ⚠️ 差评预警

**股票：** ${config.stock_name} (${config.stock_code})

**📊 未处理差评数：** ${negativeComments.length} 条

**📝 最新评论：**
${negativeComments.slice(0, 3).map((c: any) => `- ${c.comment_content?.substring(0, 50)}...`).join("\n")}

---

⏰ 请及时处理！`,
            },
          };

          await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
          });
        }

        alerts.push({
          type: "negative",
          stock_code: config.stock_code,
          stock_name: config.stock_name,
          count: negativeComments.length,
        });
      }

      // 发送敏感词预警
      if (sensitiveComments && sensitiveComments.length > 0) {
        const webhook = config.wecom_webhook;
        if (webhook) {
          const message = {
            msgtype: "markdown",
            markdown: {
              content: `##  敏感词预警

**股票：** ${config.stock_name} (${config.stock_code})

**📊 未处理敏感词评论数：** ${sensitiveComments.length} 条

**📝 最新评论：**
${sensitiveComments.slice(0, 3).map((c: any) => `- ${c.comment_content?.substring(0, 50)}... [敏感词: ${c.sensitive_words || ""}]`).join("\n")}

---

⏰ 请及时处理！`,
            },
          };

          await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
          });
        }

        alerts.push({
          type: "sensitive",
          stock_code: config.stock_code,
          stock_name: config.stock_name,
          count: sensitiveComments.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Check unprocessed error:", error);
    return NextResponse.json(
      { success: false, error: "检查失败" },
      { status: 500 }
    );
  }
}
