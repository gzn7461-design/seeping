import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import * as XLSX from "xlsx";

// 时间格式转换：将 "07-27 14:38" 转换为 "2025-07-27 14:38:00"
function parseCommentTime(timeStr: string | null | undefined): string {
  if (!timeStr) return new Date().toISOString();
  
  // 已经是完整格式
  if (timeStr.includes("T") || timeStr.includes(" ")) {
    // 检查是否是 "2025-07-27 14:38:00" 格式
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(timeStr)) {
      return timeStr;
    }
    // 检查是否是 "07-27 14:38" 格式
    if (/^\d{2}-\d{2}\s+\d{2}:\d{2}/.test(timeStr)) {
      const year = new Date().getFullYear();
      return `${year}-${timeStr}`;
    }
  }
  
  return new Date().toISOString();
}

// 检测文本中的敏感字
async function checkSensitiveWords(text: string): Promise<{ has_sensitive_words: string; sensitive_words: string | null }> {
  if (!text) return { has_sensitive_words: "false", sensitive_words: null };

  try {
    const supabase = getSupabaseClient();
    const { data: sensitiveWords, error } = await supabase
      .from("sensitive_words")
      .select("word")
      .eq("is_active", "true");

    if (error || !sensitiveWords) {
      return { has_sensitive_words: "false", sensitive_words: null };
    }

    const matchedWords: string[] = [];
    for (const item of sensitiveWords) {
      if (text.includes(item.word)) {
        matchedWords.push(item.word);
      }
    }

    if (matchedWords.length > 0) {
      return {
        has_sensitive_words: "true",
        sensitive_words: JSON.stringify(matchedWords),
      };
    }

    return { has_sensitive_words: "false", sensitive_words: null };
  } catch (error) {
    console.error("Sensitive word check failed:", error);
    return { has_sensitive_words: "false", sensitive_words: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 解析 formData（前端上传文件）
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const stockCode = (formData.get("stock_code") as string) || "";
    const stockName = (formData.get("stock_name") as string) || "";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传文件" },
        { status: 400 }
      );
    }

    if (!stockCode) {
      return NextResponse.json(
        { success: false, error: "请选择股票" },
        { status: 400 }
      );
    }

    // 解析 Excel 文件
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Excel 文件中没有数据" },
        { status: 400 }
      );
    }

    // 将 Excel 行映射为评论对象 - 兼容多种列名格式
    const comments = rows.map((row: any) => {
      const rowStockCode = String(row["股票代码"] || row["stock_code"] || row["代码"] || stockCode || "");
      const rowStockName = String(row["股票名称"] || row["stock_name"] || row["名称"] || stockName || "未知股票");
      const username = String(row["作者"] || row["username"] || row["用户名"] || "匿名用户");
      const title = String(row["主评论"] || row["标题"] || row["title"] || row["帖子标题"] || "");
      const commentContent = String(row["评论内容"] || row["content"] || row["评论"] || row["comment_content"] || row["内容"] || title);
      const commentTime = String(row["最后更新"] || row["time"] || row["时间"] || row["更新时间"] || row["comment_time"] || "");
      const sourceUrl = String(row["链接"] || row["url"] || row["source_url"] || row["来源"] || "");
      const readCount = Number(row["阅读"] || row["read_count"] || row["阅读量"] || 0);
      const replyCount = Number(row["评论数量"] || row["评论"] || row["reply_count"] || row["回复"] || 0);

      return {
        stock_code: rowStockCode || stockCode,
        stock_name: rowStockName || stockName || "未知股票",
        username,
        comment_content: commentContent,
        comment_time: commentTime,
        source_url: sourceUrl,
        read_count: readCount,
        reply_count: replyCount,
        title,
      };
    });

    const supabase = getSupabaseClient();
    const uploadedComments = [];
    const errors = [];
    const duplicateComments = [];

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

      // 查重：检查是否已存在相同作者和主评论的记录
      const { data: existingComments, error: queryError } = await supabase
        .from("stock_comments")
        .select("id, comment_time")
        .eq("username", username || "匿名用户")
        .eq("comment_content", comment_content || "")
        .limit(1);

      if (queryError) {
        console.error(`第${i + 1}条评论查询失败:`, queryError);
        errors.push({ index: i, error: queryError.message });
        continue;
      }

      // 如果存在重复记录，比较时间，保留最新的
      if (existingComments && existingComments.length > 0) {
        const existingComment = existingComments[0];
        const newTime = parseCommentTime(comment_time);
        const existingTime = existingComment.comment_time;

        if (newTime > existingTime) {
          // 新评论时间更新，删除旧记录
          await supabase
            .from("stock_comments")
            .delete()
            .eq("id", existingComment.id);
          console.log(`删除旧评论: ${existingComment.id}`);
        } else {
          // 旧评论时间更新，跳过新评论
          console.log(`跳过重复评论: ${username} - ${comment_content?.substring(0, 20)}...`);
          duplicateComments.push({ index: i, reason: "重复评论，旧记录时间更新" });
          continue;
        }
      }

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

      // 检测敏感字
      const sensitiveCheck = await checkSensitiveWords(content);

      const newComment = {
        stock_code: stock_code || "unknown",
        stock_name: stock_name || "未知股票",
        username: username || "匿名用户",
        comment_content: content,
        comment_time: parseCommentTime(comment_time),
        source_url: source_url || null,
        sentiment,
        sentiment_score,
        ai_analysis: null,
        read_count: read_count || 0,
        reply_count: reply_count || 0,
        title: title || null,
        has_sensitive_words: sensitiveCheck.has_sensitive_words,
        sensitive_words: sensitiveCheck.sensitive_words,
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

    console.log(`上传完成: 成功${uploadedComments.length}条, 失败${errors.length}条, 重复${duplicateComments.length}条`);

    // 对包含敏感字的评论发送预警通知
    const sensitiveComments = uploadedComments.filter(
      (c) => c.has_sensitive_words === "true" && c.sensitive_words
    );

    if (sensitiveComments.length > 0) {
      console.log(`检测到${sensitiveComments.length}条包含敏感字的评论，发送预警通知`);

      // 按股票分组发送预警
      const groupedByStock = sensitiveComments.reduce((acc, comment) => {
        const key = `${comment.stock_code}-${comment.stock_name}`;
        if (!acc[key]) {
          acc[key] = {
            stock_code: comment.stock_code,
            stock_name: comment.stock_name,
            comments: [],
          };
        }
        acc[key].comments.push(comment);
        return acc;
      }, {} as Record<string, { stock_code: string; stock_name: string; comments: any[] }>);

      // 并行发送所有股票的预警
      const stockGroups = Object.values(groupedByStock) as Array<{ stock_code: string; stock_name: string; comments: any[] }>;
      await Promise.all(
        stockGroups.map(async (stockGroup) => {
          const { stock_code, stock_name, comments } = stockGroup;
          for (const comment of comments) {
            try {
              let matchedWords: string[] = [];
              try {
                matchedWords = JSON.parse(comment.sensitive_words || "[]");
              } catch {
                matchedWords = [];
              }
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000"}/api/alerts/sensitive-word`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  comment,
                  matchedWords,
                  stockCode: stock_code,
                  stockName: stock_name,
                }),
              });
            } catch (error) {
              console.error(`发送预警失败 [${stock_code}]:`, error);
            }
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        uploaded: uploadedComments.length,
        failed: errors.length,
        duplicate: duplicateComments.length,
        sensitiveCount: sensitiveComments.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("批量上传评论失败:", error);
    // 添加详细堆栈日志
    if (error instanceof Error) {
      console.error("错误名称:", error.name);
      console.error("错误消息:", error.message);
      console.error("错误堆栈:", error.stack);
    }
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
