import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date') || 'today';

    const client = getSupabaseClient();

    // 计算日期范围
    const now = new Date();
    let startDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get template count
    const { count: templateCount, error: templateError } = await client
      .from('comment_templates')
      .select('*', { count: 'exact', head: true });

    if (templateError) throw new Error(`查询模板失败: ${templateError.message}`);

    // Get task counts by status
    const { data: allTasks, error: tasksError } = await client
      .from('publish_tasks')
      .select('id, status')
      .limit(10000);

    if (tasksError) throw new Error(`查询任务失败: ${tasksError.message}`);

    const totalTasks = allTasks?.length ?? 0;
    const pendingTasks = allTasks?.filter((t: { status: string }) => t.status === 'pending').length ?? 0;
    const publishedTasks = allTasks?.filter((t: { status: string }) => t.status === 'published').length ?? 0;
    const failedTasks = allTasks?.filter((t: { status: string }) => t.status === 'failed').length ?? 0;

    // Get recent tasks
    const { data: recentTasks, error: recentError } = await client
      .from('publish_tasks')
      .select('id, content, target_url, status, stock_name, stock_code, scheduled_at, published_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw new Error(`查询最近任务失败: ${recentError.message}`);

    // Get comment statistics with date filter
    const { count: totalComments, error: commentsError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true })
      .gte('comment_time', startDate.toISOString());

    if (commentsError) throw new Error(`查询评论失败: ${commentsError.message}`);

    // Get sentiment distribution with date filter
    const { data: sentimentData, error: sentimentError } = await client
      .from('stock_comments')
      .select('sentiment, comment_time')
      .gte('comment_time', startDate.toISOString())
      .limit(10000);

    if (sentimentError) throw new Error(`查询情感分布失败: ${sentimentError.message}`);

    const positiveCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'positive').length ?? 0;
    const neutralCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'neutral').length ?? 0;
    const negativeCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'negative').length ?? 0;

    // 生成图表数据（按日期分组）
    const chartDataMap = new Map<string, { positive: number; neutral: number; negative: number }>();

    sentimentData?.forEach((comment: { sentiment: string; comment_time: string }) => {
      const date = new Date(comment.comment_time).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      });

      if (!chartDataMap.has(date)) {
        chartDataMap.set(date, { positive: 0, neutral: 0, negative: 0 });
      }

      const current = chartDataMap.get(date)!;
      if (comment.sentiment === 'positive') current.positive++;
      else if (comment.sentiment === 'neutral') current.neutral++;
      else if (comment.sentiment === 'negative') current.negative++;
    });

    const chartData = Array.from(chartDataMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 饼图数据
    const pieData = [
      { name: '好评', value: positiveCount },
      { name: '一般', value: neutralCount },
      { name: '差评', value: negativeCount },
    ].filter(item => item.value > 0);

    // Get sensitive word alerts with date filter
    const { count: sensitiveAlerts, error: sensitiveError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true })
      .eq('has_sensitive_words', 'true')
      .gte('comment_time', startDate.toISOString());

    if (sensitiveError) throw new Error(`查询敏感字预警失败: ${sensitiveError.message}`);

    // Get unprocessed alerts with date filter
    const { count: unprocessedAlerts, error: unprocessedError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', 'false')
      .or('sentiment.eq.negative,has_sensitive_words.eq.true')
      .gte('comment_time', startDate.toISOString());

    if (unprocessedError) throw new Error(`查询未处理预警失败: ${unprocessedError.message}`);

    // Get alert configs count
    const { count: alertConfigs, error: alertConfigError } = await client
      .from('alert_configs')
      .select('*', { count: 'exact', head: true });

    if (alertConfigError) throw new Error(`查询预警配置失败: ${alertConfigError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        // 评论管理
        totalTemplates: templateCount ?? 0,
        totalTasks,
        pendingTasks,
        publishedTasks,
        failedTasks,
        recentTasks: recentTasks ?? [],
        // 舆情监控
        totalComments: totalComments ?? 0,
        positiveCount,
        neutralCount,
        negativeCount,
        // 预警管理
        sensitiveAlerts: sensitiveAlerts ?? 0,
        unprocessedAlerts: unprocessedAlerts ?? 0,
        alertConfigs: alertConfigs ?? 0,
        // 图表数据
        chartData,
        sentimentData: pieData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
