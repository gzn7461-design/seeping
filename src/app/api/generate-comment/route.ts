import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_code, stock_name, sentiment, style } = body;

    if (!stock_name) {
      return new Response(
        JSON.stringify({ success: false, error: '股票名称不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const sentimentMap: Record<string, string> = {
      bullish: '看多/乐观',
      bearish: '看空/悲观',
      neutral: '中性/客观',
    };

    const styleMap: Record<string, string> = {
      analysis: '专业分析型',
      discussion: '讨论交流型',
      short: '简短有力型',
    };

    const sentimentText = sentimentMap[sentiment || 'neutral'] || '中性/客观';
    const styleText = styleMap[style || 'discussion'] || '讨论交流型';

    const systemPrompt = `你是一个股吧评论助手。你需要根据用户提供的股票信息，生成适合在东方财富股吧发布的评论。

要求：
1. 评论内容要自然、真实，像普通股民的语言风格
2. 不要使用过于专业的术语，要接地气
3. 不要包含具体的投资建议或承诺收益
4. 长度控制在 20-100 字之间
5. 不要包含任何广告、链接或违规内容
6. 只输出评论内容本身，不要加引号或其他标记`;

    const userPrompt = `请为"${stock_name}"（${stock_code || '未知代码'}）生成一条股吧评论。
情绪倾向：${sentimentText}
语言风格：${styleText}

请直接输出评论内容。`;

    const messages: Message[] = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.8,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '生成失败';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
