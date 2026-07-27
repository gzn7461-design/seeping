import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 检测文本中是否包含敏感字
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "文本不能为空" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 获取所有活跃的敏感字
    const { data: sensitiveWords, error } = await supabase
      .from("sensitive_words")
      .select("word, category, level")
      .eq("is_active", "true");

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const matchedWords: Array<{ word: string; category: string; level: string }> = [];

    // 检测文本中是否包含敏感字
    for (const item of sensitiveWords || []) {
      if (text.includes(item.word)) {
        matchedWords.push({
          word: item.word,
          category: item.category,
          level: item.level,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        has_sensitive_words: matchedWords.length > 0,
        matched_words: matchedWords,
        count: matchedWords.length,
      },
    });
  } catch (error) {
    console.error("Failed to check sensitive words:", error);
    return NextResponse.json(
      { success: false, error: "敏感字检测失败" },
      { status: 500 }
    );
  }
}
