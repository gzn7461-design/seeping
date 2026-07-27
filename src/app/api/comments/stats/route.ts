import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stock_code = searchParams.get('stock_code');
    const sentiment = searchParams.get('sentiment');
    const date = searchParams.get('date');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('stock_comments')
      .select('sentiment', { count: 'exact', head: true });

    if (stock_code) {
      query = query.eq('stock_code', stock_code);
    }
    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment', sentiment);
    }
    if (date) {
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

    const { count: total, error } = await query;

    if (error) {
      throw error;
    }

    // 获取各情感的数量
    let sentimentQuery = supabase
      .from('stock_comments')
      .select('sentiment');

    if (stock_code) {
      sentimentQuery = sentimentQuery.eq('stock_code', stock_code);
    }
    if (date) {
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
      
      sentimentQuery = sentimentQuery.gte('comment_time', startDate.toISOString());
    }

    const { data: sentimentData, error: sentimentError } = await sentimentQuery;

    if (sentimentError) {
      throw sentimentError;
    }

    const positive = sentimentData?.filter(c => c.sentiment === 'positive').length || 0;
    const neutral = sentimentData?.filter(c => c.sentiment === 'neutral').length || 0;
    const negative = sentimentData?.filter(c => c.sentiment === 'negative').length || 0;

    return NextResponse.json({
      success: true,
      data: {
        total: total || 0,
        positive,
        neutral,
        negative,
      },
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
