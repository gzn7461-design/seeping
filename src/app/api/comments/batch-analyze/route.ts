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

      // AI 分析 - 优化提示词提升准确度
      const prompt = `你是一位资深的股票舆情分析师，请对以下股吧评论进行专业、准确的情感分析。

## 评论信息
股票：${comment.stock_name} (${comment.stock_code})
评论标题：${comment.title || "无"}
评论内容：${comment.comment_content}

## 分析要求

请从以下维度进行细致分析：

### 1. 情感倾向分类
- **看好（positive）**：表达乐观、看涨、正面评价，如"涨停""突破""利好""底部""抄底""加仓""看好"
- **看空（negative）**：表达悲观、看跌、负面评价，如"跌停""割肉""套牢""利空""崩盘""风险""垃圾""骗子"
- **中性（neutral）**：客观陈述、信息分享、提问、技术分析讨论、无明显情绪倾向

### 2. 分析理由（2-3句话）
- 具体指出评论中哪些词语或表达体现了该情感倾向
- 分析评论的语境和表达方式（理性分析/情绪宣泄/经验分享）

### 3. 关键词提取
- 提取3-5个最能体现评论情感倾向的关键词
- 优先提取股票市场专业术语

### 4. 投资建议参考
- 基于评论内容给出1句话的参考建议

## 输出格式
请严格以JSON格式返回，不要包含其他文字：
{
  "sentiment": "positive/negative/neutral",
  "sentiment_label": "看好/看空/中性",
  "reason": "分析理由（2-3句话）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "suggestion": "投资建议参考"
}`;

      const messages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
      const response = await client.invoke(messages, { 
        temperature: 0.7,
        model: "doubao-seed-2-0-pro-260215" // 使用更智能的模型
      });

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
