// api/chat.js - Vercel Serverless Function (Google Gemini)
const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(200).json({ result: '错误：未找到 GEMINI_API_KEY，请检查 Vercel 环境变量' });

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1000 }
  });

  const path = `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            res.status(200).json({ result: `Gemini错误：${parsed.error.message}` });
          } else {
            const result = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            res.status(200).json({ result: result || `无内容：${JSON.stringify(parsed).slice(0,200)}` });
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
