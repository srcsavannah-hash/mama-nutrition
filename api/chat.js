const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { prompt } = JSON.parse(event.body || '{}');
  if (!prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing prompt' }) };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { statusCode: 200, headers, body: JSON.stringify({ result: '错误：未找到 GROQ_API_KEY' }) };

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000
  });

  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const result = parsed.choices?.[0]?.message?.content || '暂时无法获取建议';
          resolve({ statusCode: 200, headers, body: JSON.stringify({ result }) });
        } catch {
          resolve({ statusCode: 200, headers, body: JSON.stringify({ result: '解析失败' }) });
        }
      });
    });
    request.on('error', () => {
      resolve({ statusCode: 200, headers, body: JSON.stringify({ result: '请求失败' }) });
    });
    request.write(body);
    request.end();
  });
};
