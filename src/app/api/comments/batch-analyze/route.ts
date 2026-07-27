import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment_ids } = body;

    if (!comment_ids || !Array.isArray(comment_ids) || comment_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "评论ID不能为空" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const analyzedComments = [];

    for (const commentId of comment_ids) {
      // 获取评论
      const { data: comment, error: fetchError } = await supabase
        .from("stock_comments")
        .select("*")
        .eq("id", commentId)
        .single();

      if (fetchError || !comment) {
        continue;
      }

      // AI 分析
      const prompt = `请分析以下股吧主评论的情感倾向，并给出详细分析：

股票：${comment.stock_name} (${comment.stock_code})
主评论：${comment.comment_content}

请从以下维度分析：
1. 情感倾向（看好/看空/中性）
2. 分析理由（2-3句话）
3. 关键词提取（3-5个关键词）
4. 投资建议参考（1句话）

请以JSON格式返回：
{
  "sentiment": "positive/negative/neutral",
  "sentiment_label": "看好/看空/中性",
  "reason": "分析理由",
  "keywords": ["关键词1", "关键词2"],
  "suggestion": "投资建议"
}`;

      const messages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
      const response = await client.invoke(messages, { temperature: 0.7 });

      // 解析AI响应
      let aiResult = {
        sentiment: "neutral",
        sentiment_label: "中性",
        reason: "",
        keywords: [],
        suggestion: "",
      };

      try {
        const content = response.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }

      // 更新评论
      await supabase
        .from("stock_comments")
        .update({
          sentiment: aiResult.sentiment,
          sentiment_score: aiResult.sentiment === "positive" ? "0.8" : aiResult.sentiment === "negative" ? "-0.8" : "0",
          ai_analysis: JSON.stringify(aiResult),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      analyzedComments.push({
        id: commentId,
        ...aiResult,
      });
    }

    return NextResponse.json({
      success: true,
      data: analyzedComments,
    });
  } catch (error) {
    console.error("Batch analyze error:", error);
    return NextResponse.json(
      { success: false, error: "批量分析失败" },
      { status: 500 }
    );
  }
}
