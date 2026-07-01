import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";

// 东方财富股吧评论 API
async function fetchEastmoneyComments(stockCode: string, page: number = 1, pageSize: number = 30) {
  // 东方财富股吧 API - 获取帖子列表
  // 参考: https://guba.eastmoney.com/interface/GetData.aspx
  const url = `https://guba.eastmoney.com/interface/GetData.aspx`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://guba.eastmoney.com/list,${stockCode}.html`,
        'Accept': 'application/json, text/plain, */*',
      },
      body: `param=sort=1&pagesize=${pageSize}&page=${page}&code=${stockCode}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    // 解析返回数据 - 东方财富返回的是JSON格式
    const data = JSON.parse(text);
    
    // 东方财富API返回格式: { re: [...] } 或 { replies: [...] }
    const comments = data?.re || data?.replies || [];
    
    if (Array.isArray(comments) && comments.length > 0) {
      return comments.map((item: {
        post_user?: { user_nickname?: string };
        post_content?: string;
        post_publish_time?: string;
        post_id?: string;
        post_title?: string;
        user_id?: string;
        userid?: string;
      }) => {
        // 提取用户名 - 可能在不同字段
        const username = item.post_user?.user_nickname || 
                        item.user_id || 
                        item.userid || 
                        '匿名用户';
        
        // 提取内容 - 可能是 post_content 或 post_title
        const content = item.post_content || item.post_title || '';
        
        return {
          username,
          content,
          time: item.post_publish_time || new Date().toISOString(),
          id: item.post_id || `post_${Date.now()}_${Math.random()}`,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch comments from Eastmoney:', error);
    // 返回空数组，不再使用模拟数据
    return [];
  }
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
    
    // 如果没有获取到评论，返回提示信息
    if (rawComments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          collected: 0,
          comments: [],
          message: '未获取到评论数据，可能是网络问题或该股票暂无评论。请检查股票代码是否正确，或稍后重试。',
        },
      });
    }
    
    const supabase = getSupabaseClient();
    const collectedComments = [];

    for (const comment of rawComments) {
      // 情感分析
      const analysis = simpleSentimentAnalysis(comment.content);
      
      // 生成评论URL（东方财富股吧帖子链接格式）
      // 格式: https://guba.eastmoney.com/{stock_code},{post_id}.html
      const sourceUrl = `https://guba.eastmoney.com/${stock_code},${comment.id}.html`;
      
      // 保存到数据库
      const newComment = {
        stock_code,
        stock_name: stock_name || '未知股票',
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
