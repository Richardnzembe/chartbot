// server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = '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';

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
