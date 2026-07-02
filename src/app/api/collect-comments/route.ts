import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { stockComments } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";

// 东方财富股吧评论采集 - 使用网页解析方式
async function fetchEastmoneyComments(stockCode: string, page: number = 1, pageSize: number = 30) {
  // 东方财富股吧网页URL
  // 格式: https://guba.eastmoney.com/list,{stockCode}_{page}.html
  const url = `https://guba.eastmoney.com/list,${stockCode}_${page}.html`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://guba.eastmoney.com/',
      },
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }

    const html = await response.text();
    
    // 解析HTML提取评论数据
    // 东方财富股吧的评论结构通常在特定class中
    const comments: Array<{
      username: string;
      content: string;
      time: string;
      id: string;
    }> = [];
    
    // 使用正则表达式提取帖子数据
    // 东方财富股吧的帖子通常包含以下信息：
    // - 帖子ID (data-id 或 class中的数字)
    // - 用户名
    // - 内容/标题
    // - 发布时间
    
    // 提取帖子列表 - 匹配常见的帖子结构
    const postPattern = /<div[^>]*class="[^"]*list-item[^"]*"[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/div>/g;
    let match;
    
    while ((match = postPattern.exec(html)) !== null && comments.length < pageSize) {
      const postId = match[1];
      const postHtml = match[2];
      
      // 提取用户名
      const usernameMatch = postHtml.match(/class="[^"]*user[_-]?name[^"]*"[^>]*>([^<]+)</i) ||
                           postHtml.match(/class="[^"]*nickname[^"]*"[^>]*>([^<]+)</i) ||
                           postHtml.match(/<a[^>]*class="[^"]*user[^"]*"[^>]*>([^<]+)</i);
      const username = usernameMatch ? usernameMatch[1].trim() : '匿名用户';
      
      // 提取内容/标题
      const contentMatch = postHtml.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i) ||
                          postHtml.match(/class="[^"]*content[^"]*"[^>]*>([^<]+)</i) ||
                          postHtml.match(/<a[^>]*class="[^"]*topic[^"]*"[^>]*>([^<]+)</i);
      const content = contentMatch ? contentMatch[1].trim() : '';
      
      // 提取时间
      const timeMatch = postHtml.match(/class="[^"]*time[^"]*"[^>]*>([^<]+)</i) ||
                       postHtml.match(/class="[^"]*date[^"]*"[^>]*>([^<]+)</i) ||
                       postHtml.match(/(\d{2}-\d{2}\s+\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1].trim() : new Date().toISOString();
      
      if (content) {
        comments.push({
          username,
          content,
          time,
          id: postId,
        });
      }
    }
    
    // 如果正则表达式没有匹配到，尝试使用更宽松的匹配
    if (comments.length === 0) {
      // 尝试匹配所有包含帖子信息的div
      const loosePattern = /<div[^>]*>([\s\S]*?)<\/div>/g;
      const allDivs: string[] = [];
      let looseMatch;
      
      while ((looseMatch = loosePattern.exec(html)) !== null) {
        allDivs.push(looseMatch[1]);
      }
      
      // 从所有div中提取可能的帖子信息
      for (const div of allDivs) {
        if (comments.length >= pageSize) break;
        
        // 检查是否包含帖子特征
        if (div.includes('post_') || div.includes('topic') || div.includes('title')) {
          // 提取可能的用户名
          const userMatch = div.match(/>([^<]{2,20})<\/(?:a|span)>/);
          // 提取可能的内容
          const contentMatch = div.match(/>([^<]{5,100})<\/(?:a|span|div)>/);
          
          if (contentMatch && contentMatch[1].length > 5) {
            comments.push({
              username: userMatch ? userMatch[1].trim() : '匿名用户',
              content: contentMatch[1].trim(),
              time: new Date().toISOString(),
              id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            });
          }
        }
      }
    }
    
    console.log(`Parsed ${comments.length} comments from HTML`);
    return comments;
  } catch (error) {
    console.error('Failed to fetch comments from Eastmoney:', error);
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
          message: '未获取到评论数据。东方财富股吧可能有反爬虫机制，建议稍后重试或手动添加评论数据。',
        },
      });
    }
    
    const supabase = getSupabaseClient();
    const collectedComments = [];

    for (const comment of rawComments) {
      // 情感分析
      const analysis = simpleSentimentAnalysis(comment.content);
      
      // 生成评论URL（东方财富股吧帖子链接格式）
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
