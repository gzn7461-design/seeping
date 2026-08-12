import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, type } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择要删除的记录" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 敏感字预警记录存储在 stock_comments 表中
    if (type === "sensitive") {
      const { error } = await supabase
        .from("stock_comments")
        .delete()
        .in("id", ids);

      if (error) throw error;
    } else {
      // 差评预警记录存储在 alert_records 表中
      const { error } = await supabase
        .from("alert_records")
        .delete()
        .in("id", ids);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${ids.length} 条记录`,
    });
  } catch (error) {
    console.error("批量删除预警记录失败:", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
