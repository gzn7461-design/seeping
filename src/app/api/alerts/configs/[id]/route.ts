import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stock_code, stock_name, negative_threshold, wecom_webhook, alert_types, check_interval, daily_push_enabled, daily_push_time } = body;

    if (!stock_code || !stock_name || !wecom_webhook) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('alert_configs')
      .update({
        stock_code,
        stock_name,
        negative_threshold: negative_threshold || '30',
        check_interval: check_interval || '30',
        daily_push_enabled: daily_push_enabled || 'false',
        daily_push_time: daily_push_time || null,
        wecom_webhook,
        alert_types: alert_types || 'negative,sensitive_word',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to update alert config:', error);
    return NextResponse.json(
      { success: false, error: '更新预警配置失败' },
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
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('alert_configs')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete alert config:', error);
    return NextResponse.json(
      { success: false, error: '删除预警配置失败' },
      { status: 500 }
    );
  }
}
