import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 更新敏感字
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { word, category, level, is_active } = body;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("sensitive_words")
      .update({
        word: word !== undefined ? word : undefined,
        category: category !== undefined ? category : undefined,
        level: level !== undefined ? level : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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
    console.error("Failed to update sensitive word:", error);
    return NextResponse.json(
      { success: false, error: "更新敏感字失败" },
      { status: 500 }
    );
  }
}

// 删除敏感字
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("sensitive_words")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sensitive word:", error);
    return NextResponse.json(
      { success: false, error: "删除敏感字失败" },
      { status: 500 }
    );
  }
}
