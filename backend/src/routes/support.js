const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { Resend } = require('resend');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/contact', authenticate, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message || message.trim().length < 20) {
    return res.status(400).json({ error: 'Subject and message (min 20 chars) required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true },
    });

    await resend.emails.send({
      from: 'FaithFlow <onboarding@resend.dev>',
      to: 'richiestephenson.77@gmail.com',
      subject: `[FaithFlow Support] ${subject}`,
      html: `
        <h2>FaithFlow Support Request</h2>
        <p><strong>From:</strong> ${user.name} (${user.email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr/>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
