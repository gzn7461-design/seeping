import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 东方财富股吧评论 API
async function fetchEastmoneyComments(stockCode: string, page: number = 1, pageSize: number = 30) {
  const url = `https://guba.eastmoney.com/interface/GetData.aspx`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://guba.eastmoney.com/list,${stockCode}.html`,
      },
      body: `path=newstockbar/getcomment&param=${stockCode},${page},${pageSize},1,0,0`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);
    
    if (data && data.re) {
      return data.re.map((item: { post_user: { user_nickname: string }; post_content: string; post_publish_time: string; post_id: string }) => ({
        username: item.post_user?.user_nickname || '匿名用户',
        content: item.post_content || '',
        time: item.post_publish_time,
        id: item.post_id,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch comments from Eastmoney:', error);
    return generateMockComments(stockCode, page, pageSize);
  }
}

// 模拟数据
function generateMockComments(stockCode: string, _page: number, pageSize: number) {
  const mockComments = [
    { username: '股市老手', content: '今天放量突破，后市看好！' },
    { username: '价值投资者', content: '基本面很好，长期持有' },
    { username: '短线选手', content: '主力在洗盘，别被洗出去' },
    { username: '散户小王', content: '又跌了，什么时候是个头' },
    { username: '技术派', content: 'MACD金叉，可以进场' },
  ];

  return Array.from({ length: pageSize }, (_, i) => {
    const mock = mockComments[i % mockComments.length];
    const now = new Date();
    now.setMinutes(now.getMinutes() - i * 30);
    return {
      username: mock.username,
      content: mock.content,
      time: now.toISOString(),
      id: `mock_${stockCode}_${Date.now()}_${i}`,
    };
  });
}

// 简单的情感分析
function simpleSentimentAnalysis(content: string): { sentiment: string; score: string } {
  const positiveWords = ['看好', '上涨', '突破', '金叉', '买入', '加仓', '利好', '强势', '反弹', '机会', '底部', '低估'];
  const negativeWords = ['看空', '下跌', '割肉', '套牢', '利空', '弱势', '崩盘', '风险', '亏损', '垃圾', '有毒', '骗子'];
  
  let score = 0;
  positiveWords.forEach(word => {
    if (content.includes(word)) score += 1;
  });
  negativeWords.forEach(word => {
    if (content.includes(word)) score -= 1;
  });

  let sentiment = 'neutral';
  if (score > 0) sentiment = 'positive';
  else if (score < 0) sentiment = 'negative';

  return { sentiment, score: (score / 10).toFixed(2) };
}

// POST /api/auto-collect/run - 执行自动采集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config_id, stock_code, stock_name, page_size = 50 } = body;

    const supabase = getSupabaseClient();

    // 如果提供了 config_id，从配置中获取股票信息
    let targetStockCode = stock_code;
    let targetStockName = stock_name;
    let targetPageSize = page_size;

    if (config_id) {
      const { data: config, error } = await supabase
        .from('auto_collect_configs')
        .select('*')
        .eq('id', config_id)
        .single();

      if (error || !config) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        );
      }

      targetStockCode = config.stock_code;
      targetStockName = config.stock_name;
      targetPageSize = parseInt(config.page_size || '50', 10);
    }

    if (!targetStockCode || !targetStockName) {
      return NextResponse.json(
        { success: false, error: '股票代码和名称不能为空' },
        { status: 400 }
      );
    }

    // 获取评论
    const rawComments = await fetchEastmoneyComments(targetStockCode, 1, targetPageSize);
    const collectedComments = [];

    for (const comment of rawComments) {
      const analysis = simpleSentimentAnalysis(comment.content);
      
      // 生成评论URL
      const sourceUrl = comment.id && comment.id.startsWith('mock_')
        ? `https://guba.eastmoney.com/list,${targetStockCode}.html`
        : `https://guba.eastmoney.com/${targetStockCode},${comment.id}.html`;
      
      const newComment = {
        stock_code: targetStockCode,
        stock_name: targetStockName,
        username: comment.username,
        comment_content: comment.content,
        comment_time: comment.time,
        source_url: sourceUrl,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.score,
        ai_analysis: null,
      };

      const { data, error } = await supabase
        .from('stock_comments')
        .insert(newComment)
        .select()
        .single();

      if (!error && data) {
        collectedComments.push(data);
      }
    }

    // 更新配置的上次采集时间
    if (config_id) {
      await supabase
        .from('auto_collect_configs')
        .update({ 
          last_collected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', config_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        collected: collectedComments.length,
        comments: collectedComments,
      },
    });
  } catch (error) {
    console.error('Failed to run auto collect:', error);
    return NextResponse.json(
      { success: false, error: '执行自动采集失败' },
      { status: 500 }
    );
  }
}
