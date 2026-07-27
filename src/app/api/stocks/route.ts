import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockList } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("stock_list")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("获取股票列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取股票列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, stock_name } = body;

    if (!stock_code || !stock_name) {
      return NextResponse.json(
        { success: false, error: "股票代码和名称不能为空" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 检查是否已存在
    const { data: existing } = await supabase
      .from("stock_list")
      .select("id")
      .eq("stock_code", stock_code)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "该股票代码已存在" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stock_list")
      .insert([{ stock_code, stock_name }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("添加股票失败:", error);
    return NextResponse.json(
      { success: false, error: "添加股票失败" },
      { status: 500 }
    );
  }
}
