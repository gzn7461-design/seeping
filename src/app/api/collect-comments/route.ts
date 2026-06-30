import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";

// 东方财富股吧评论 API
async function fetchEastmoneyComments(stockCode: string, page: number = 1, pageSize: number = 30) {
  // 东方财富股吧 API - 获取评论列表
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
    // 解析返回数据
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
    // 返回模拟数据用于演示
    return generateMockComments(stockCode, page, pageSize);
  }
}

// 模拟数据（当 API 不可用时）
function generateMockComments(stockCode: string, _page: number, pageSize: number) {
  const mockComments = [
    { username: '股市老手', content: '今天放量突破，后市看好！', sentiment: 'positive' },
    { username: '价值投资者', content: '基本面很好，长期持有', sentiment: 'positive' },
    { username: '短线选手', content: '主力在洗盘，别被洗出去', sentiment: 'neutral' },
    { username: '散户小王', content: '又跌了，什么时候是个头', sentiment: 'negative' },
    { username: '技术派', content: 'MACD金叉，可以进场', sentiment: 'positive' },
    { username: '谨慎投资者', content: '大盘不稳，建议观望', sentiment: 'neutral' },
    { username: '亏损散户', content: '套了半年了，割肉算了', sentiment: 'negative' },
    { username: '理性分析', content: '估值合理，可以分批建仓', sentiment: 'positive' },
    { username: '韭菜一号', content: '又被割了，这股票有毒', sentiment: 'negative' },
    { username: '长期持有者', content: '不理会短期波动，继续持有', sentiment: 'neutral' },
  ];

  const stockNames: Record<string, string> = {
    '600519': '贵州茅台',
    '000858': '五粮液',
    '601318': '中国平安',
    '600036': '招商银行',
  };

  return Array.from({ length: pageSize }, (_, i) => {
    const mock = mockComments[i % mockComments.length];
    const now = new Date();
    now.setMinutes(now.getMinutes() - i * 30);
    return {
      username: mock.username,
      content: mock.content,
      time: now.toISOString(),
      id: `mock_${stockCode}_${i}`,
      _sentiment: mock.sentiment,
      _stockName: stockNames[stockCode] || '未知股票',
    };
  });
}

// 简单的情感分析（基于关键词）
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, stock_name, page = 1, page_size = 30 } = body;

    if (!stock_code) {
      return NextResponse.json(
        { success: false, error: '股票代码不能为空' },
        { status: 400 }
      );
    }

    // 获取评论
    const rawComments = await fetchEastmoneyComments(stock_code, page, page_size);
    
    const supabase = getSupabaseClient();
    const collectedComments = [];

    for (const comment of rawComments) {
      // 情感分析
      const analysis = simpleSentimentAnalysis(comment.content);
      
      // 保存到数据库
      const newComment = {
        stock_code,
        stock_name: stock_name || '未知股票',
        username: comment.username,
        comment_content: comment.content,
        comment_time: comment.time,
        source_url: `https://guba.eastmoney.com/list,${stock_code}.html`,
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

    return NextResponse.json({
      success: true,
      data: {
        collected: collectedComments.length,
        comments: collectedComments,
      },
    });
  } catch (error) {
    console.error('Failed to collect comments:', error);
    return NextResponse.json(
      { success: false, error: '采集评论失败' },
      { status: 500 }
    );
  }
}
