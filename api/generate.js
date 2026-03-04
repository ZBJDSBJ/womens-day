export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // GET: 健康检查
  if (req.method === 'GET') {
    const key = process.env.DEEPSEEK_API_KEY;
    return new Response(
      JSON.stringify({ status: key ? `✅ DeepSeek API Key 已配置（${key.slice(0, 10)}...）` : '❌ 未配置 DEEPSEEK_API_KEY' }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 DEEPSEEK_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  let prompt = '';
  try {
    const body = await req.json();
    prompt = body.prompt || '';
  } catch (e) {}

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1024,
        stream: true,
        messages: [{ role: 'user', content: prompt || '你好' }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek API 错误 ${upstream.status}`, detail: errText }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // 解析 DeepSeek SSE 流（OpenAI 兼容格式），转为 {text} 格式
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 1);
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(
                    new TextEncoder().encode('data: ' + JSON.stringify({ text }) + '\n\n')
                  );
                }
              } catch {}
            }
          }
        } finally {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...CORS },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
}
