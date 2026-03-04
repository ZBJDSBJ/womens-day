export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // GET: 健康检查，浏览器直接访问 /api/generate 可确认配置
  if (req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY;
    return new Response(
      JSON.stringify({ status: key ? '✅ Gemini API Key 已配置' : '❌ 未配置 GEMINI_API_KEY' }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 GEMINI_API_KEY，请在 Vercel 后台设置环境变量' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  let prompt = '';
  try {
    const body = await req.json();
    prompt = body.prompt || '';
  } catch (e) {}

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt || '你好' }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.9 },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return new Response(
        JSON.stringify({ error: `Gemini API 错误 ${upstream.status}`, detail: err }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // 把 Gemini SSE 流解析后，转换为简单的 {text} 格式传给前端
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
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
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
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...CORS,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
}
