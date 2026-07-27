import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取敏感字列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");

    let query = supabase.from("sensitive_words").select("*");

    if (category) {
      query = query.eq("category", category);
    }
    if (isActive) {
      query = query.eq("is_active", isActive);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Failed to fetch sensitive words:", error);
    return NextResponse.json(
      { success: false, error: "获取敏感字列表失败" },
      { status: 500 }
    );
  }
}

// 创建敏感字
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, category, level } = body;

    if (!word) {
      return NextResponse.json(
        { success: false, error: "敏感字不能为空" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 检查是否已存在
    const { data: existing } = await supabase
      .from("sensitive_words")
      .select("id")
      .eq("word", word)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "该敏感字已存在" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("sensitive_words")
      .insert({
        word,
        category: category || "general",
        level: level || "medium",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to create sensitive word:", error);
    return NextResponse.json(
      { success: false, error: "创建敏感字失败" },
      { status: 500 }
    );
  }
}
