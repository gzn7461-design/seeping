import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("alert_records")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("获取预警记录失败:", error);
    return NextResponse.json(
      { success: false, error: "获取预警记录失败" },
      { status: 500 }
    );
  }
}
