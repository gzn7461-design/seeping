import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comments } = body;

    console.log("收到上传请求，评论数量:", comments?.length);

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { success: false, error: "评论数据不能为空" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const uploadedComments = [];
    const errors = [];

    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      console.log(`处理第${i + 1}条评论:`, comment);

      const {
        stock_code,
        stock_name,
        username,
        comment_content,
        comment_time,
        source_url,
        read_count,
        reply_count,
        title,
      } = comment;

      // 简单的情感分析（基于关键词）
      let sentiment = "neutral";
      let sentiment_score = "0.00";
      
      const positiveWords = ["看好", "上涨", "突破", "金叉", "买入", "加仓", "利好", "强势", "反弹", "机会", "底部", "低估"];
      const negativeWords = ["看空", "下跌", "割肉", "套牢", "利空", "弱势", "崩盘", "风险", "亏损", "垃圾", "有毒", "骗子"];
      
      let score = 0;
      const content = comment_content || "";
      positiveWords.forEach(word => {
        if (content.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (content.includes(word)) score -= 1;
      });

      if (score > 0) {
        sentiment = "positive";
        sentiment_score = (score / 10).toFixed(2);
      } else if (score < 0) {
        sentiment = "negative";
        sentiment_score = (score / 10).toFixed(2);
      }

      const newComment = {
        stock_code: stock_code || "unknown",
        stock_name: stock_name || "未知股票",
        username: username || "匿名用户",
        comment_content: content,
        comment_time: comment_time || new Date().toISOString(),
        source_url: source_url || null,
        sentiment,
        sentiment_score,
        ai_analysis: null,
        read_count: read_count || 0,
        reply_count: reply_count || 0,
        title: title || null,
      };

      console.log("准备插入数据:", newComment);

      const { data, error } = await supabase
        .from("stock_comments")
        .insert(newComment)
        .select()
        .single();

      if (error) {
        console.error(`第${i + 1}条评论插入失败:`, error);
        errors.push({ index: i, error: error.message });
      } else if (data) {
        console.log(`第${i + 1}条评论插入成功:`, data.id);
        uploadedComments.push(data);
      }
    }

    console.log(`上传完成: 成功${uploadedComments.length}条, 失败${errors.length}条`);

    return NextResponse.json({
      success: true,
      data: {
        uploaded: uploadedComments.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("批量上传评论失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
