import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();

    const [
      { count: totalTemplates, error: templateError },
      { count: totalTasks, error: taskError },
      { count: pendingTasks, error: pendingError },
      { count: publishedTasks, error: publishedError },
      { count: failedTasks, error: failedError },
    ] = await Promise.all([
      client.from('comment_templates').select('*', { count: 'exact', head: true }),
      client.from('publish_tasks').select('*', { count: 'exact', head: true }),
      client.from('publish_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('publish_tasks').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      client.from('publish_tasks').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    if (templateError) throw new Error(`统计模板失败: ${templateError.message}`);
    if (taskError) throw new Error(`统计任务失败: ${taskError.message}`);
    if (pendingError) throw new Error(`统计待发布失败: ${pendingError.message}`);
    if (publishedError) throw new Error(`统计已发布失败: ${publishedError.message}`);
    if (failedError) throw new Error(`统计失败任务失败: ${failedError.message}`);

    // Get recent tasks
    const { data: recentTasks, error: recentError } = await client
      .from('publish_tasks')
      .select('id, content, target_url, status, scheduled_at, published_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw new Error(`查询最近任务失败: ${recentError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        totalTemplates: totalTemplates || 0,
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        publishedTasks: publishedTasks || 0,
        failedTasks: failedTasks || 0,
        recentTasks: recentTasks || [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
