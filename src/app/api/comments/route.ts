import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stock_code = searchParams.get('stock_code');
    const sentiment = searchParams.get('sentiment');
    const date = searchParams.get('date');
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
    if (date) {
      // 日期筛选：today, week, month, quarter, half, year
      const now = new Date();
      let startDate: Date;
      
      switch (date) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'half':
          const half = now.getMonth() < 6 ? 0 : 6;
          startDate = new Date(now.getFullYear(), half, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      
      query = query.gte('comment_time', startDate.toISOString());
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
