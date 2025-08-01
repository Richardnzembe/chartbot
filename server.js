// server.js

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENROUTER_API_KEY;

// Test route
app.get('/', (req, res) => {
  res.send('✅ Dalswin Chartbot backend is running!');
});

// Chat route with strong teaching tone & filters
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
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'system',
            content: `
You are an intelligent, friendly, and professional school chatbot working for Dalswin Life and Business Institute.

Your job is to help students learn through reasoning, not by giving direct answers. 
NEVER give a plain answer — always ask guiding questions, explain concepts step-by-step, and include relevant examples where possible.

❗ DO NOT answer or entertain topics outside of academics, like news, rumors, gossip, celebrities, politics, or religion.

✅ If the student greets you (e.g., "Hi", "Hello"), respond once with a professional welcome, but DO NOT repeat the greeting in every reply.

🛑 Avoid saying "Hi, I am..." or repeating your name again and again.

⚠️ If a question is off-topic, kindly let the student know you can only help with school-related learning topics.

Write in clear, simple academic English, and keep a warm and helpful tone — like a patient tutor.

Do not use emojis or overly casual expressions. Stay focused on educational quality.
            `.trim(),
          },
          {
            role: 'user',
            content: question,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'No response from OpenRouter.' });
    }

    const message = data.choices[0].message.content;
    res.json({ answer: message });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to fetch from OpenRouter.' });
  }
});

// Download conversation as Word document
app.post('/download', async (req, res) => {
  const chat = req.body.chat;

  if (!chat || !Array.isArray(chat)) {
    return res.status(400).json({ error: 'Invalid chat data' });
  }

  try {
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
    const fileName = 'school_chatbot_notes.docx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate Word document.' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
