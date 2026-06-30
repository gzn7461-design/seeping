import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const stockCode = searchParams.get('stock_code');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const client = getSupabaseClient();
    let query = client
      .from('publish_tasks')
      .select('id, template_id, content, target_url, target_platform, status, stock_code, stock_name, scheduled_at, published_at, error_message, created_at, updated_at')
      .order('scheduled_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (stockCode) {
      query = query.eq('stock_code', stockCode);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, content, target_url, target_platform, scheduled_at, stock_code, stock_name } = body;

    if (!content || !target_url || !scheduled_at) {
      return NextResponse.json(
        { success: false, error: '内容、目标URL和计划时间不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('publish_tasks')
      .insert({
        template_id: template_id || null,
        content,
        target_url,
        target_platform: target_platform || 'eastmoney',
        scheduled_at,
        status: 'pending',
        stock_code: stock_code || null,
        stock_name: stock_name || null,
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
