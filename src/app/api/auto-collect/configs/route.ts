import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { autoCollectConfigs } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// GET /api/auto-collect/configs - 获取自动采集配置列表
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('auto_collect_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Failed to fetch auto collect configs:', error);
    return NextResponse.json(
      { success: false, error: '获取自动采集配置失败' },
      { status: 500 }
    );
  }
}

// POST /api/auto-collect/configs - 创建自动采集配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, stock_name, collect_interval = 'daily', collect_time, page_size = '50' } = body;

    if (!stock_code || !stock_name) {
      return NextResponse.json(
        { success: false, error: '股票代码和名称不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('auto_collect_configs')
      .insert({
        stock_code,
        stock_name,
        collect_interval,
        collect_time: collect_time || '09:00',
        page_size: String(page_size),
        is_active: 'true',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to create auto collect config:', error);
    return NextResponse.json(
      { success: false, error: '创建自动采集配置失败' },
      { status: 500 }
    );
  }
}

// PUT /api/auto-collect/configs - 更新自动采集配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '配置ID不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('auto_collect_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update auto collect config:', error);
    return NextResponse.json(
      { success: false, error: '更新自动采集配置失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/auto-collect/configs - 删除自动采集配置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '配置ID不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('auto_collect_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete auto collect config:', error);
    return NextResponse.json(
      { success: false, error: '删除自动采集配置失败' },
      { status: 500 }
    );
  }
}
