
const { notifyUser } = require('../services/socketService');
const prisma = require('../db');

const PARTICIPANT_SELECT = {
  include: { user: { select: { id: true, name: true, profilePhoto: true } } },
};

async function getConversations(req, res) {
  try {
    const convos = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user.id } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: PARTICIPANT_SELECT,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const result = await Promise.all(convos.map(async (c) => {
      const other = c.participants.find(p => p.user.id !== req.user.id)?.user;
      const me = c.participants.find(p => p.user.id === req.user.id);
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: req.user.id },
          isRead: false,
        },
      });
      return { id: c.id, other, lastMessage: c.messages[0] || null, unread, updatedAt: c.updatedAt };
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
}

async function startConversation(req, res) {
  const { userId } = req.body;
  if (!userId || userId === req.user.id) return res.status(400).json({ error: 'Invalid user' });
  try {
    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId } } },
        ],
      },
      include: { participants: PARTICIPANT_SELECT },
    });
    if (existing) return res.json({ id: existing.id, existing: true });

    const convo = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: req.user.id }, { userId }],
        },
      },
    });
    res.status(201).json({ id: convo.id });
  } catch (err) {
    console.error('startConversation error:', err);
    res.status(500).json({ error: 'Failed to start conversation', detail: err.message });
  }
}

async function getMessages(req, res) {
  const { conversationId } = req.params;
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
        replyTo: { select: { id: true, content: true, senderId: true, audioUrl: true } },
      },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

async function sendMessage(req, res) {
  const { conversationId } = req.params;
  const { content, replyToId } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    // Only allow replying to a message that belongs to this same conversation
    let validReplyToId = null;
    if (replyToId) {
      const parent = await prisma.message.findUnique({ where: { id: replyToId }, select: { conversationId: true } });
      if (parent && parent.conversationId === conversationId) validReplyToId = replyToId;
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: req.user.id, content: content.trim(), replyToId: validReplyToId },
        include: {
          sender: { select: { id: true, name: true, profilePhoto: true } },
          replyTo: { select: { id: true, content: true, senderId: true, audioUrl: true } },
        },
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    // Notify the other participant
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: req.user.id } },
    });
    const io = req.app.get('io');
    for (const p of others) {
      io.to(`conversation:${conversationId}`).emit('message_received', message);
      // Bell notification
      await prisma.notification.create({
        data: {
          userId: p.userId,
          type: 'NEW_MESSAGE',
          message: `New message from ${message.sender.name}`,
          fromUser: req.user.id,
          refId: conversationId,
        },
      });
      notifyUser(io, p.userId, 'notification', {
        type: 'NEW_MESSAGE',
        message: `New message from ${message.sender.name}`,
      });
    }

    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
}

async function sendAudioMessage(req, res) {
  const { conversationId } = req.params;
  const audioUrl = req.file?.path;
  const audioDuration = req.body.duration ? Math.round(Number(req.body.duration)) : null;
  if (!audioUrl) return res.status(400).json({ error: 'Audio file required' });
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: req.user.id, content: '', audioUrl, audioDuration },
        include: { sender: { select: { id: true, name: true, profilePhoto: true } } },
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: req.user.id } },
    });
    const io = req.app.get('io');
    for (const p of others) {
      io.to(`conversation:${conversationId}`).emit('message_received', message);
      await prisma.notification.create({
        data: {
          userId: p.userId,
          type: 'NEW_MESSAGE',
          message: `New voice message from ${message.sender.name}`,
          fromUser: req.user.id,
          refId: conversationId,
        },
      });
      notifyUser(io, p.userId, 'notification', {
        type: 'NEW_MESSAGE',
        message: `New voice message from ${message.sender.name}`,
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error('sendAudioMessage error:', err);
    res.status(500).json({ error: 'Failed to send voice message' });
  }
}

async function unsendMessage(req, res) {
  const { messageId } = req.params;
  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'You can only unsend your own messages' });

    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: '', audioUrl: null, audioDuration: null, reaction: null, replyToId: null },
    });

    const io = req.app.get('io');
    io.to(`conversation:${message.conversationId}`).emit('message:unsend', { messageId });
    res.json({ ok: true, messageId });
  } catch (err) {
    console.error('unsendMessage error:', err);
    res.status(500).json({ error: 'Failed to unsend message' });
  }
}

async function markRead(req, res) {
  const { conversationId } = req.params;
  try {
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
      data: { lastReadAt: new Date() },
    });
    // Tell the other participant their messages have been seen (live "Seen" receipt)
    const io = req.app.get('io');
    io.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, readerId: req.user.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark read' });
  }
}

async function getTotalUnread(req, res) {
  try {
    const convos = await prisma.conversationParticipant.findMany({
      where: { userId: req.user.id },
      select: { conversationId: true },
    });
    const count = await prisma.message.count({
      where: {
        conversationId: { in: convos.map(c => c.conversationId) },
        senderId: { not: req.user.id },
        isRead: false,
      },
    });
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

async function setReaction(req, res) {
  const { messageId } = req.params;
  const { emoji } = req.body;
  if (emoji !== null && (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 8))
    return res.status(400).json({ error: 'emoji must be a short string or null' });
  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reaction: emoji },
    });

    const io = req.app.get('io');
    io.to(`conversation:${message.conversationId}`).emit('message:reaction', { messageId, emoji });

    res.json({ id: updated.id, reaction: updated.reaction });
  } catch (err) {
    console.error('setReaction error:', err);
    res.status(500).json({ error: 'Failed to set reaction' });
  }
}

module.exports = { getConversations, startConversation, getMessages, sendMessage, sendAudioMessage, markRead, getTotalUnread, setReaction, unsendMessage };
