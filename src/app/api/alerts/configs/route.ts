import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { alertConfigs } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stock_code = searchParams.get('stock_code');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('alert_configs')
      .select('*');

    if (stock_code) {
      query = query.eq('stock_code', stock_code);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Failed to fetch alert configs:', error);
    return NextResponse.json(
      { success: false, error: '获取预警配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, stock_name, negative_threshold, wecom_webhook, check_interval, daily_push_enabled, daily_push_time } = body;

    if (!stock_code || !stock_name || !wecom_webhook) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('alert_configs')
      .insert({
        stock_code,
        stock_name,
        negative_threshold: negative_threshold || '30',
        check_interval: check_interval || '30',
        daily_push_enabled: daily_push_enabled || 'false',
        daily_push_time: daily_push_time || null,
        wecom_webhook,
        is_active: 'true',
      })
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
    console.error('Failed to create alert config:', error);
    return NextResponse.json(
      { success: false, error: '创建预警配置失败' },
      { status: 500 }
    );
  }
}
