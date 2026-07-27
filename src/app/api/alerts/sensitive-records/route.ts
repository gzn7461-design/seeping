import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // 获取包含敏感字的评论
    const { data, error } = await supabase
      .from("stock_comments")
      .select("*")
      .eq("has_sensitive_words", "true")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // 转换为敏感字预警格式
    const sensitiveAlerts = (data || []).map((comment: any) => ({
      id: comment.id,
      stock_code: comment.stock_code,
      stock_name: comment.stock_name,
      username: comment.username,
      comment_content: comment.comment_content,
      sensitive_words: comment.sensitive_words,
      comment_time: comment.comment_time,
      created_at: comment.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: sensitiveAlerts,
    });
  } catch (error) {
    console.error("获取敏感字预警记录失败:", error);
    return NextResponse.json(
      { success: false, error: "获取敏感字预警记录失败" },
      { status: 500 }
    );
  }
}
