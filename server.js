import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENROUTER_API_KEY; // <-- Must be set in Railway env vars!

// Simple health check route
app.get('/', (req, res) => {
  res.send('✅ Chartbot backend is running!');
});

app.post('/chat', async (req, res) => {
  const question = req.body.question;

  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }

  try {
    const response = await fetch('https://api.openrouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openrouter/llama-2-7b-chat',
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json({ answer: data.choices[0].message.content });
  } catch (error) {
    console.error('OpenRouter API error:', error);
    res.status(500).json({ error: 'OpenRouter API request failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
