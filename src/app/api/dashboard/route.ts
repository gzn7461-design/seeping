import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();

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

    // Get comment statistics
    const { count: totalComments, error: commentsError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true });

    if (commentsError) throw new Error(`查询评论失败: ${commentsError.message}`);

    // Get sentiment distribution
    const { data: sentimentData, error: sentimentError } = await client
      .from('stock_comments')
      .select('sentiment')
      .limit(10000);

    if (sentimentError) throw new Error(`查询情感分布失败: ${sentimentError.message}`);

    const positiveCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'positive').length ?? 0;
    const neutralCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'neutral').length ?? 0;
    const negativeCount = sentimentData?.filter((c: { sentiment: string }) => c.sentiment === 'negative').length ?? 0;

    // Get sensitive word alerts
    const { count: sensitiveAlerts, error: sensitiveError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true })
      .eq('has_sensitive_words', 'true');

    if (sensitiveError) throw new Error(`查询敏感字预警失败: ${sensitiveError.message}`);

    // Get unprocessed alerts
    const { count: unprocessedAlerts, error: unprocessedError } = await client
      .from('stock_comments')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', 'false')
      .or('sentiment.eq.negative,has_sensitive_words.eq.true');

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
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
