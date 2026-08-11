import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { date, configId } = await request.json();

    const pushDate = date || new Date().toISOString().split("T")[0];
    const supabase = getSupabaseClient();

    // 查询指定日期的评论
    const startOfDay = `${pushDate} 00:00:00`;
    const endOfDay = `${pushDate} 23:59:59`;

    const { data: comments, error } = await supabase
      .from("stock_comments")
      .select("*")
      .gte("comment_time", startOfDay)
      .lte("comment_time", endOfDay)
      .order("comment_time", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: "查询评论失败" }, { status: 500 });
    }

    const total = comments?.length || 0;
    const positive = comments?.filter((c: any) => c.sentiment === "positive").length || 0;
    const neutral = comments?.filter((c: any) => c.sentiment === "neutral").length || 0;
    const negative = comments?.filter((c: any) => c.sentiment === "negative").length || 0;
    const sensitiveCount = comments?.filter((c: any) => c.has_sensitive_words === "true").length || 0;
    const unprocessed = comments?.filter((c: any) => c.is_processed !== "true").length || 0;

    // 生成整体分析
    let overallAnalysis = "暂无分析";
    if (total > 0) {
      const commentSummaries = comments!
        .slice(0, 50)
        .map((c: any) => `【${c.sentiment === "positive" ? "看好" : c.sentiment === "negative" ? "看空" : "中性"}】${c.comment_content?.slice(0, 100)}`)
        .join("\n");

      const aiPrompt = `你是一个专业的股吧舆论分析专家。请对以下 ${total} 条股吧评论进行整体分析。

时间范围：${pushDate}
总评论数：${total} 条
情感分布：看好 ${positive} 条 / 看空 ${negative} 条 / 中性 ${neutral} 条
涉及敏感词：${sensitiveCount} 条

部分评论摘要：
${commentSummaries}

请输出一段简洁的总结分析（200字以内），概括今日舆论倾向和主要关注点。`;

      const config = new Config();
      const client = new LLMClient(config);
      const response = await client.invoke(
        [
          { role: "system", content: "你是一个专业的股票舆论分析专家。" },
          { role: "user", content: aiPrompt },
        ],
        { model: "doubao-seed-2-0-pro-260215", temperature: 0.3 }
      );
      overallAnalysis = response.content;
    }

    // 构造推送消息
    const dateObj = new Date(pushDate);
    const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${String(dateObj.getDate()).padStart(2, "0")}`;

    const message = `## 📊 舆论监控平台运行情况

**${dateStr} 日报**

---

### 📈 今日数据概览
> 今日股吧评论 **${total}** 条

| 指标 | 数量 |
| :--- | :--- |
| 👍 好评 | **${positive}** 条 |
| ➖ 一般 | **${neutral}** 条 |
| 👎 差评 | **${negative}** 条 |
| ⚠️ 敏感字 | **${sensitiveCount}** 条 |
| 🔴 未处理 | **${unprocessed}** 条 |

---

### 📝 整体分析
${overallAnalysis}

---

> _数据来源：CommentHub 舆情监控系统_`;

    // 发送到企微机器人
    if (configId) {
      const { data: alertConfig } = await supabase
        .from("alert_configs")
        .select("wecom_webhook")
        .eq("id", configId)
        .single();

      if (alertConfig?.wecom_webhook) {
        await fetch(alertConfig.wecom_webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            msgtype: "markdown",
            markdown: { content: message },
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        date: pushDate,
        stats: { total, positive, neutral, negative, sensitiveCount, unprocessed },
        analysis: overallAnalysis,
        pushed: !!configId,
      },
    });
  } catch (error: any) {
    console.error("日报推送失败:", error);
    return NextResponse.json({ success: false, error: `日报推送失败: ${error.message}` }, { status: 500 });
  }
}