import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENROUTER_API_KEY;

// Basic in-memory map to store user topic preference (for this version)
const userTopics = {}; // Example: { "student@email.com": "math" }

// Home route
app.get('/', (req, res) => {
  res.send('✅ Chartbot backend is running!');
});

// Main Chat route
app.post('/chat', async (req, res) => {
  const { question, userEmail } = req.body;

  if (!question || !userEmail) {
    return res.status(400).json({ error: 'Missing question or user email' });
  }

  // If it's a new user, assign them a blank topic
  if (!userTopics[userEmail]) {
    userTopics[userEmail] = '';
  }

  // Build system message to control bot behavior
  const systemPrompt = `
You are an expert teacher and instructor at Dalswin Life and Business Institute, similar to the CS50 virtual assistant.
You always help students with accurate, academic, and in-depth explanations.
Never give straight answers — instead, teach students how to figure things out using examples, analogies, and step-by-step reasoning.

Rules:
- Do not discuss rumors, personal opinions, or non-educational content.
- If the question is off-topic (e.g., politics, news, gossip, entertainment), politely say you only assist with academic content.
- Avoid repeating greetings like "Hi, how can I help" in every response.
- Remember the student’s focus area per session and keep responses within that scope.

If the student’s topic is not clear yet, gently ask them what subject they're working on.
Once known, stick to that subject in all replies.

Respond with an academic, respectful, and supportive tone.
`;

  const userMessage = question.trim();

  // Optional keyword detection to set focus (simple implementation)
  const schoolSubjects = ['math', 'history', 'biology', 'science', 'computer', 'english', 'physics', 'chemistry', 'programming'];

  for (let subject of schoolSubjects) {
    if (userMessage.toLowerCase().includes(subject)) {
      userTopics[userEmail] = subject;
      break;
    }
  }

  const knownTopic = userTopics[userEmail];
  const userPrompt = knownTopic
    ? `Topic: ${knownTopic}\nQuestion: ${userMessage}`
    : userMessage;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const message = data.choices[0].message.content;
    res.json({ answer: message });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to fetch from OpenRouter' });
  }
});

// Download conversation route (unchanged)
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
