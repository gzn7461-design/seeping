import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stock_code = searchParams.get('stock_code');
    const sentiment = searchParams.get('sentiment');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('stock_comments')
      .select('*', { count: 'exact' });

    if (stock_code) {
      query = query.eq('stock_code', stock_code);
    }
    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }

    const { data, error, count } = await query
      .order('comment_time', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { success: false, error: '获取评论列表失败' },
      { status: 500 }
    );
  }
}
