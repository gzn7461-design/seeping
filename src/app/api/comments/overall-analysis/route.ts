import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { start_date, end_date, stock_code } = await request.json();
    const startDate = start_date;
    const endDate = end_date;
    const stockCode = stock_code;

    const supabase = getSupabaseClient();

    // 查询指定时间范围内的评论
    let query = supabase
      .from("stock_comments")
      .select("*")
      .gte("comment_time", startDate)
      .lte("comment_time", endDate)
      .order("comment_time", { ascending: false });

    if (stockCode) {
      query = query.eq("stock_code", stockCode);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("查询评论失败:", error);
      return NextResponse.json({ success: false, error: "查询评论失败" }, { status: 500 });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          analysis: "该时间段内暂无评论数据",
          stats: { positive: 0, neutral: 0, negative: 0, total: 0 },
        },
      });
    }

    // 统计情感分布
    const stats = {
      positive: comments.filter((c: any) => c.sentiment === "positive").length,
      negative: comments.filter((c: any) => c.sentiment === "negative").length,
      neutral: comments.filter((c: any) => c.sentiment === "neutral").length,
      total: comments.length,
    };

    // 获取敏感词评论数
    const sensitiveCount = comments.filter((c: any) => c.has_sensitive_words === "true").length;

    // 准备给 AI 分析的评论摘要
    const commentSummaries = comments
      .slice(0, 50)
      .map((c: any) => `【${c.sentiment === "positive" ? "看好" : c.sentiment === "negative" ? "看空" : "中性"}】${c.comment_content?.slice(0, 100)}`)
      .join("\n");

    const aiPrompt = `你是一个专业的股吧舆论分析专家。请对以下 ${comments.length} 条股吧评论进行整体分析。

时间范围：${startDate} 至 ${endDate}
总评论数：${comments.length} 条
情感分布：看好 ${stats.positive} 条 / 看空 ${stats.negative} 条 / 中性 ${stats.neutral} 条
涉及敏感词：${sensitiveCount} 条

部分评论摘要：
${commentSummaries}

请从以下维度进行分析：
1. 整体舆论倾向（看好/看空/中性，以及强度）
2. 主要关注点（投资者最关注哪些话题）
3. 风险提示（有哪些值得关注的负面信号）
4. 投资建议（基于舆论的参考建议）

请以JSON格式返回：
{
  "overall_sentiment": "看好/看空/中性/分歧较大",
  "confidence": 0.0-1.0,
  "key_points": ["关注点1", "关注点2", "关注点3", "关注点4"],
  "risk_warnings": ["风险1", "风险2"],
  "suggestion": "综合建议",
  "summary": "整体分析总结（200字以内）"
}`;

    const config = new Config();
    const client = new LLMClient(config);

    const response = await client.invoke(
      [
        { role: "system", content: "你是一个专业的股票舆论分析专家，擅长从股吧评论中提取有价值的信息。" },
        { role: "user", content: aiPrompt },
      ],
      { model: "doubao-seed-2-0-pro-260215", temperature: 0.3 }
    );

    let analysisResult;
    try {
      analysisResult = JSON.parse(response.content);
    } catch {
      analysisResult = {
        overall_sentiment: "分析失败",
        confidence: 0,
        key_points: [],
        risk_warnings: [],
        suggestion: "暂无法分析",
        summary: response.content.slice(0, 200),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        total: comments.length,
        stats,
        sensitiveCount,
        analysis: analysisResult,
        dateRange: { start: startDate, end: endDate },
      },
    });
  } catch (error: any) {
    console.error("整体分析失败:", error);
    return NextResponse.json({ success: false, error: `整体分析失败: ${error.message}` }, { status: 500 });
  }
}