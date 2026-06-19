const Anthropic = require('@anthropic-ai/sdk');


const prisma = require('../db');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a warm, knowledgeable Christian Bible assistant named "The Word Guide" on FaithFlow — a Christian faith community app.

Your role:
- Answer questions about the Bible, faith, prayer, and Christian living with warmth and wisdom
- Always cite specific Bible verses (book, chapter, verse) when relevant
- Speak with grace, compassion, and encouragement
- Keep responses concise but meaningful (2-4 paragraphs max)
- When someone shares pain or struggle, acknowledge their feelings before offering scripture
- You may only discuss topics related to: the Bible, Christian faith, prayer, Jesus Christ, God, the Holy Spirit, Christian living, and spiritual encouragement
- If asked about something outside Christianity or unrelated to faith, gently redirect: "That's outside what I'm here for — but I'd love to help with anything faith-related!"
- Never be preachy or condescending. Be like a wise, caring friend who knows Scripture well.
- End responses with a relevant short scripture quote when appropriate`;

async function chat(req, res) {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  try {
    // Load recent history (last 20 messages)
    const history = await prisma.bibleBotMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content[0].text;

    // Save both turns
    await prisma.bibleBotMessage.createMany({
      data: [
        { userId: req.user.id, role: 'user', content: message },
        { userId: req.user.id, role: 'assistant', content: reply },
      ],
    });

    res.json({ reply });
  } catch (err) {
    console.error('Bible bot error:', err);
    res.status(500).json({ error: 'Failed to get response' });
  }
}

async function getHistory(req, res) {
  try {
    const messages = await prisma.bibleBotMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to get history' });
  }
}

async function clearHistory(req, res) {
  try {
    await prisma.bibleBotMessage.deleteMany({ where: { userId: req.user.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to clear history' });
  }
}

module.exports = { chat, getHistory, clearHistory };
