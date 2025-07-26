// server.js

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENROUTER_API_KEY; // Don't hardcode — keep secure in Railway env vars

// Optional: simple home route
app.get('/', (req, res) => {
  res.send('✅ Chartbot backend is live!');
});

// Main chat route
app.post('/chat', async (req, res) => {
  const question = req.body.question;

  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct', // ✅ Updated to valid OpenRouter model
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content || '⚠️ No answer returned.';
    res.json({ answer: message });
  } catch (err) {
    console.error('Fetch failed:', err);
    res.status(500).json({ error: '❌ Failed to contact OpenRouter AI' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
