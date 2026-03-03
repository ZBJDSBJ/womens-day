export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method === 'GET') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return new Response(
      JSON.stringify({ status: apiKey ? `✅ API Key 已配置（${apiKey.slice(0,14)}...）` : '❌ 未配置 ANTHROPIC_API_KEY' }, null, 2),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: '未配置 ANTHROPIC_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  let prompt = '';
  try {
    const body = await req.json();
    prompt = body.prompt || '';
  } catch (e) {}

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'user', content: prompt || '你好' }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: `Anthropic 返回 ${upstream.status}`, detail: errText }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
