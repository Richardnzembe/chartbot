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
  res.send('✅ Chartbot backend is running!');
});

// Chat route with teaching personality and quiz mode
app.post('/chat', async (req, res) => {
  const { question, userEmail, mode } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }
  if (!userEmail) {
    return res.status(400).json({ error: 'User email required for memory' });
  }

  // System message changes based on mode
  const systemMessage = mode === 'quiz'
    ? `
You are a professional quiz coach at Dalswin Life and Business Institute.
When in quiz mode, ask the student questions related to school subjects, guide their thinking, and explain answers step-by-step.
Do not give direct answers immediately. Engage the student in active learning.
Use clear, friendly, and encouraging language.
Avoid off-topic discussions or rumors.
    `.trim()
    : `
You are a qualified and friendly teacher from Dalswin Life and Business Institute.
Always greet the student warmly but only once per session.
Explain concepts clearly with examples.
Avoid giving direct answers; guide the student to understand the reasoning.
Use simple academic language suitable for high school and college students.
Avoid off-topic discussions or rumors.
    `.trim();

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
          { role: 'system', content: systemMessage },
          { role: 'user', content: question },
          // Optional: You can add userEmail for context or memory extension here
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

// Download conversation as Word doc
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

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
