export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // GET: 健康检查 + 测试 API Key 是否真的可用
  if (req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ status: '❌ 未配置 GEMINI_API_KEY' }),
        { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // 发一个最小测试请求验证 Key 是否真实可用
    try {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
        }
      );
      const testBody = await testRes.json();
      if (!testRes.ok) {
        return new Response(JSON.stringify({
          status: `❌ Key 配置了但不可用，HTTP ${testRes.status}`,
          error: testBody,
        }), { headers: { 'Content-Type': 'application/json', ...CORS } });
      }
      return new Response(JSON.stringify({
        status: '✅ Gemini API Key 配置正确且可用',
        key_prefix: key.slice(0, 10) + '...',
        test_response: testBody.candidates?.[0]?.content?.parts?.[0]?.text,
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    } catch (e) {
      return new Response(JSON.stringify({ status: '❌ 测试请求失败', error: e.message }),
        { headers: { 'Content-Type': 'application/json', ...CORS } });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 GEMINI_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  let prompt = '';
  try {
    const body = await req.json();
    prompt = body.prompt || '';
  } catch (e) {}

  // 按顺序尝试多个模型，第一个失败自动换下一个
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
  ];

  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

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
        const errText = await upstream.text();
        lastError = { status: upstream.status, model, detail: errText };
        // 429 或 503 才换模型重试，其他错误直接返回
        if (upstream.status === 429 || upstream.status === 503) continue;
        return new Response(
          JSON.stringify({ error: `API 错误 ${upstream.status}（模型：${model}）`, detail: errText }),
          { status: upstream.status, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }

      // 成功：转换 Gemini SSE 流为 {text} 格式
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
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...CORS },
      });

    } catch (e) {
      lastError = { model, error: e.message };
      continue;
    }
  }

  // 所有模型都失败
  return new Response(
    JSON.stringify({ error: '所有模型均不可用，请检查 API Key 或稍后重试', detail: lastError }),
    { status: 429, headers: { 'Content-Type': 'application/json', ...CORS } }
  );
}
