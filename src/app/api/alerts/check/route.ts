import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { alertConfigs, alertRecords, stockComments } from "@/storage/database/shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// 发送企业微信机器人消息
async function sendWecomMessage(webhook: string, message: string) {
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'text',
        text: {
          content: message,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send WeChat Work message:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, force_check = false } = body;

    const supabase = getSupabaseClient();
    
    // 获取所有活跃的预警配置
    let configQuery = supabase
      .from('alert_configs')
      .select('*')
      .eq('is_active', 'true');

    if (stock_code) {
      configQuery = configQuery.eq('stock_code', stock_code);
    }

    const { data: configs, error: configError } = await configQuery;

    if (configError) {
      throw configError;
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: '没有活跃的预警配置', alerts: [] },
      });
    }

    const alerts = [];

    for (const config of configs) {
      // 获取该股票最近24小时的评论统计
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: comments, error: commentsError } = await supabase
        .from('stock_comments')
        .select('sentiment')
        .eq('stock_code', config.stock_code)
        .gte('collected_at', yesterday.toISOString());

      if (commentsError) {
        console.error('Failed to fetch comments for alert check:', commentsError);
        continue;
      }

      if (!comments || comments.length === 0) {
        continue;
      }

      // 计算差评占比
      const totalComments = comments.length;
      const negativeComments = comments.filter(c => c.sentiment === 'negative').length;
      const negativePercentage = (negativeComments / totalComments) * 100;

      const threshold = parseFloat(config.negative_threshold);

      // 检查是否超过阈值
      if (negativePercentage >= threshold || force_check) {
        const message = `## 🚨 舆情预警

**股票：** ${config.stock_name} (${config.stock_code})

**📊 差评占比：** ${negativePercentage.toFixed(1)}% (${negativeComments}/${totalComments})

**⚠️ 预警阈值：** ${threshold}%

**📅 统计时间：** 最近24小时

---

 **预警时间：** ${new Date().toLocaleString("zh-CN")}

请及时关注舆情动态！`;

        // 发送企业微信消息
        try {
          await sendWecomMessage(config.wecom_webhook, message);
          
          // 记录预警
          await supabase
            .from('alert_records')
            .insert({
              config_id: config.id,
              stock_code: config.stock_code,
              stock_name: config.stock_name,
              alert_type: 'negative_threshold',
              threshold: threshold.toString(),
              actual_value: negativePercentage.toFixed(1),
              message,
              sent_at: new Date().toISOString(),
            });

          alerts.push({
            stock_code: config.stock_code,
            stock_name: config.stock_name,
            negative_percentage: negativePercentage.toFixed(1),
            threshold,
            message_sent: true,
          });
        } catch (sendError) {
          console.error('Failed to send alert:', sendError);
          alerts.push({
            stock_code: config.stock_code,
            stock_name: config.stock_name,
            negative_percentage: negativePercentage.toFixed(1),
            threshold,
            message_sent: false,
            error: '发送预警消息失败',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checked_configs: configs.length,
        alerts,
      },
    });
  } catch (error) {
    console.error('Failed to check alerts:', error);
    return NextResponse.json(
      { success: false, error: '检查预警失败' },
      { status: 500 }
    );
  }
}
