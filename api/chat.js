const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(200).json({ result: '错误：未找到 GROQ_API_KEY' });

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
          if (parsed.error) {
            res.status(200).json({ result: `错误：${parsed.error.message}` });
          } else {
            const result = parsed.choices?.[0]?.message?.content;
            res.status(200).json({ result: result || '暂时无法获取建议' });
          }
        } catch(e) {
          res.status(200).json({ result: `解析失败：${data.slice(0,200)}` });
        }
        resolve();
      });
    });

    request.on('error', (e) => {
      res.status(200).json({ result: `请求失败：${e.message}` });
      resolve();
    });

    request.write(body);
    request.end();
  });
};
