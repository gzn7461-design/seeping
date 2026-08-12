import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供要删除的记录ID" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("alert_records")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { deleted: ids.length },
      message: `成功删除 ${ids.length} 条预警记录`,
    });
  } catch (error) {
    console.error("批量删除预警记录失败:", error);
    return NextResponse.json(
      { success: false, error: "批量删除预警记录失败" },
      { status: 500 }
    );
  }
}