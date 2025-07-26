// server.js

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use environment variable for your API key (set it in Railway Variables)
const apiKey = process.env.OPENROUTER_API_KEY;

// ✅ Root route to test if backend is running
app.get('/', (req, res) => {
  res.send('✅ Chartbot backend is running!');
});

// ✅ Handle chat requests
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
        messages: [{ role: 'user', content: question }],
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

// ✅ Handle Word document download
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

// ✅ Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
