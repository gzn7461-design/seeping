import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择要删除的评论" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("stock_comments")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { deleted: ids.length },
    });
  } catch (error) {
    console.error("批量删除评论失败:", error);
    return NextResponse.json(
      { success: false, error: "批量删除评论失败" },
      { status: 500 }
    );
  }
}