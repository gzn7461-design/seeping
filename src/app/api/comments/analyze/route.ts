import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment_id } = body;

    if (!comment_id) {
      return NextResponse.json(
        { success: false, error: '评论ID不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // 获取评论
    const { data: comment, error } = await supabase
      .from('stock_comments')
      .select('*')
      .eq('id', comment_id)
      .single();

    if (error || !comment) {
      return NextResponse.json(
        { success: false, error: '评论不存在' },
        { status: 404 }
      );
    }

    // 使用 AI 分析评论
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: 'system' as const,
        content: `你是一位资深的股票舆情分析师，请对以下股吧评论进行专业、准确的情感分析。

## 分析要求

### 情感倾向分类
- **看好（positive）**：表达乐观、看涨，如"涨停""突破""利好""底部""抄底"
- **看空（negative）**：表达悲观、看跌，如"跌停""割肉""套牢""利空""崩盘"
- **中性（neutral）**：客观陈述、信息分享、无明显情绪倾向

### 分析维度
1. 情感分类：[positive/neutral/negative]
2. 情感得分：[-1.0 到 1.0 之间，-1为极度负面，1为极度正面]
3. 分析理由：具体指出评论中哪些词语或表达体现了该情感倾向（2-3句话）
4. 关键词：提取评论中的关键情感词（3-5个）`,
      },
      {
        role: 'user' as const,
        content: `股票：${comment.stock_name} (${comment.stock_code})\n评论标题：${comment.title || "无"}\n评论内容：${comment.comment_content}`,
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.3,
    });

    const fullAnalysis = response.content;

    // 解析 AI 分析结果
    let sentiment = comment.sentiment;
    let sentimentScore = comment.sentiment_score;

    // 尝试从分析结果中提取情感和得分
    const sentimentMatch = fullAnalysis.match(/情感分类[：:]\s*(positive|neutral|negative)/i);
    const scoreMatch = fullAnalysis.match(/情感得分[：:]\s*([-+]?\d*\.?\d+)/);

    if (sentimentMatch) {
      sentiment = sentimentMatch[1].toLowerCase();
    }
    if (scoreMatch) {
      sentimentScore = scoreMatch[1];
    }

    // 更新数据库
    const { data: updatedComment, error: updateError } = await supabase
      .from('stock_comments')
      .update({
        sentiment,
        sentiment_score: sentimentScore,
        ai_analysis: fullAnalysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', comment_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedComment,
    });
  } catch (error) {
    console.error('Failed to analyze comment:', error);
    return NextResponse.json(
      { success: false, error: 'AI分析失败' },
      { status: 500 }
    );
  }
}
