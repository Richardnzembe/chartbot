// server.js

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENROUTER_API_KEY;

// Home route for health check
app.get('/', (req, res) => {
  res.send('✅ Chartbot backend is running!');
});

// Chat route using OpenRouter
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
        model: 'mistralai/mistral-7b-instruct', // ✅ Valid model
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content || '⚠️ No response received.';
    res.json({ answer: message });
  } catch (err) {
    console.error('Fetch failed:', err);
    res.status(500).json({ error: '❌ Failed to contact OpenRouter AI' });
  }
});

// Download route to create a Word document from chat history
app.post('/download', async (req, res) => {
  const chat = req.body.chat;

  if (!chat || !Array.isArray(chat)) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: chat.map(
          (msg) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${msg.sender}: `, bold: true }),
                new TextRun(msg.text),
              ],
            })
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=school_chatbot_notes.docx');
  res.send(buffer);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
