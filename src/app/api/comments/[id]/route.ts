import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sentiment } = body;

    if (!sentiment || !["positive", "neutral", "negative"].includes(sentiment)) {
      return NextResponse.json(
        { success: false, error: "无效的情感标签" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("stock_comments")
      .update({ sentiment })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("更新评论情感失败:", error);
    return NextResponse.json(
      { success: false, error: "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("stock_comments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除评论失败:", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
