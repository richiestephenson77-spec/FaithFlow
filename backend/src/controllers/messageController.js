
const { notifyUser } = require('../services/socketService');
const prisma = require('../db');
const { getBlockedUserIds, isBlockedBetween } = require('../utils/blocks');

const PARTICIPANT_SELECT = {
  include: { user: { select: { id: true, name: true, profilePhoto: true } } },
};

// The other participant of a 1:1 conversation (or null).
async function otherParticipantId(conversationId, meId) {
  const p = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: meId } },
    select: { userId: true },
  });
  return p?.userId || null;
}

// Guard used by every send path: returns a clean error (not a crash) when a
// block exists in either direction. Returns null when sending is allowed.
async function blockGuard(conversationId, meId) {
  const otherId = await otherParticipantId(conversationId, meId);
  if (otherId && await isBlockedBetween(meId, otherId)) {
    return 'You can no longer message this person.';
  }
  return null;
}

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

    // Moderation: hide conversations with users in a block relationship
    const blockedIds = new Set(await getBlockedUserIds(req.user.id));

    // Unread counts for ALL conversations in a single groupBy — previously this
    // fired one message.count per conversation (N parallel queries per request,
    // a major source of connection-pool pressure for chatty users).
    const unreadRows = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: convos.map(c => c.id) },
        senderId: { not: req.user.id },
        isRead: false,
      },
      _count: { _all: true },
    });
    const unreadByConvo = new Map(unreadRows.map(r => [r.conversationId, r._count._all]));

    const result = convos.map((c) => {
      const other = c.participants.find(p => p.user.id !== req.user.id)?.user;
      if (other && blockedIds.has(other.id)) return null; // hidden from both sides
      return { id: c.id, other, lastMessage: c.messages[0] || null, unread: unreadByConvo.get(c.id) || 0, updatedAt: c.updatedAt };
    }).filter(Boolean);

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
    if (await isBlockedBetween(req.user.id, userId)) {
      return res.status(403).json({ error: 'You can no longer message this person.' });
    }

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

// Attach a `sharedPrayerRequest` object to any messages that reference one.
// Plain-id lookup (no FK) so a deleted request just resolves to null.
async function hydrateSharedPrayers(messages) {
  const ids = [...new Set(messages.map(m => m.sharedPrayerRequestId).filter(Boolean))];
  if (ids.length === 0) return messages;
  const requests = await prisma.prayerRequest.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, title: true, body: true, category: true, isAnswered: true, createdAt: true,
      user: { select: { id: true, name: true, profilePhoto: true } },
    },
  });
  const byId = new Map(requests.map(r => [r.id, r]));
  return messages.map(m => m.sharedPrayerRequestId
    ? { ...m, sharedPrayerRequest: byId.get(m.sharedPrayerRequestId) || null }
    : m);
}

async function getMessages(req, res) {
  const { conversationId } = req.params;
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    // Moderation: a block hides the whole thread from both sides
    const otherParticipant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: req.user.id } },
      select: { userId: true, readReceiptsEnabled: true },
    });
    const otherId = otherParticipant?.userId || null;
    if (otherId && await isBlockedBetween(req.user.id, otherId)) {
      return res.status(403).json({ error: 'This conversation is unavailable.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId, isRemoved: false }, // admin-removed messages excluded
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, profilePhoto: true } },
        replyTo: { select: { id: true, content: true, senderId: true, audioUrl: true } },
      },
    });
    let hydrated = await hydrateSharedPrayers(messages);

    // Read receipts (mutual): the sender only sees "Seen" if BOTH participants
    // keep receipts on. Mask isRead on the viewer's OWN sent messages otherwise
    // (masks the response only — the DB isRead stays accurate for unread counts).
    const receiptsVisible = (participant.readReceiptsEnabled !== false) && (otherParticipant?.readReceiptsEnabled !== false);
    if (!receiptsVisible) {
      hydrated = hydrated.map(m => (m.senderId === req.user.id ? { ...m, isRead: false } : m));
    }
    // Per-user conversation settings so the thread opens with the right theme.
    res.json({
      messages: hydrated,
      settings: {
        theme: participant.theme,
        vanishMode: participant.vanishMode,
        readReceiptsEnabled: participant.readReceiptsEnabled,
        typingIndicatorEnabled: participant.typingIndicatorEnabled,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

// PATCH this user's per-conversation settings (theme + persisted UI toggles).
// vanishMode / read-receipts / typing-indicator are persisted only this batch;
// enforcement comes later.
async function updateConversationSettings(req, res) {
  const { conversationId } = req.params;
  const { theme, vanishMode, readReceiptsEnabled, typingIndicatorEnabled } = req.body || {};
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    const data = {};
    if (typeof theme === 'string') data.theme = theme;
    if (typeof vanishMode === 'boolean') data.vanishMode = vanishMode;
    if (typeof readReceiptsEnabled === 'boolean') data.readReceiptsEnabled = readReceiptsEnabled;
    if (typeof typingIndicatorEnabled === 'boolean') data.typingIndicatorEnabled = typingIndicatorEnabled;

    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
      data,
      select: { theme: true, vanishMode: true, readReceiptsEnabled: true, typingIndicatorEnabled: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('updateConversationSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

// All image messages in a conversation, newest first, for the shared-media grid.
async function getConversationMedia(req, res) {
  const { conversationId } = req.params;
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
      select: { id: true },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });

    const rows = await prisma.message.findMany({
      where: { conversationId, isRemoved: false, isDeleted: false, imageUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageUrl: true, createdAt: true },
    });
    res.json(rows.map(r => ({ id: r.id, mediaUrl: r.imageUrl, sentAt: r.createdAt })));
  } catch (err) {
    console.error('getConversationMedia error:', err);
    res.status(500).json({ error: 'Failed to get media' });
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
    const blockMsg1 = await blockGuard(conversationId, req.user.id);
    if (blockMsg1) return res.status(403).json({ error: blockMsg1 });

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
    const blockMsg2 = await blockGuard(conversationId, req.user.id);
    if (blockMsg2) return res.status(403).json({ error: blockMsg2 });

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

async function sendImageMessage(req, res) {
  const { conversationId } = req.params;
  const imageUrl = req.file?.path;
  if (!imageUrl) return res.status(400).json({ error: 'Image file required' });
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });
    const blockMsg3 = await blockGuard(conversationId, req.user.id);
    if (blockMsg3) return res.status(403).json({ error: blockMsg3 });

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: req.user.id, content: '', imageUrl },
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
          message: `New photo from ${message.sender.name}`,
          fromUser: req.user.id,
          refId: conversationId,
        },
      });
      notifyUser(io, p.userId, 'notification', {
        type: 'NEW_MESSAGE',
        message: `New photo from ${message.sender.name}`,
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error('sendImageMessage error:', err);
    res.status(500).json({ error: 'Failed to send photo' });
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

async function sharePrayerRequest(req, res) {
  const { conversationId } = req.params;
  const { prayerRequestId } = req.body;
  if (!prayerRequestId) return res.status(400).json({ error: 'prayerRequestId required' });
  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    });
    if (!participant) return res.status(403).json({ error: 'Not in this conversation' });
    const blockMsg4 = await blockGuard(conversationId, req.user.id);
    if (blockMsg4) return res.status(403).json({ error: blockMsg4 });

    // Only allow sharing your OWN prayer request
    const pr = await prisma.prayerRequest.findUnique({ where: { id: prayerRequestId }, select: { userId: true } });
    if (!pr) return res.status(404).json({ error: 'Prayer request not found' });
    if (pr.userId !== req.user.id) return res.status(403).json({ error: 'You can only share your own prayer requests' });

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: req.user.id, content: '', sharedPrayerRequestId: prayerRequestId },
        include: { sender: { select: { id: true, name: true, profilePhoto: true } } },
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    const [hydrated] = await hydrateSharedPrayers([message]);
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: req.user.id } },
    });
    const io = req.app.get('io');
    for (const p of others) {
      io.to(`conversation:${conversationId}`).emit('message_received', hydrated);
      await prisma.notification.create({
        data: {
          userId: p.userId,
          type: 'NEW_MESSAGE',
          message: `${message.sender.name} shared a prayer request`,
          fromUser: req.user.id,
          refId: conversationId,
        },
      });
      notifyUser(io, p.userId, 'notification', {
        type: 'NEW_MESSAGE',
        message: `${message.sender.name} shared a prayer request`,
      });
    }

    res.status(201).json(hydrated);
  } catch (err) {
    console.error('sharePrayerRequest error:', err);
    res.status(500).json({ error: 'Failed to share prayer request' });
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

    // Live "Seen" receipt — only emit when BOTH participants keep receipts on,
    // so a user with read receipts off never leaks their read status.
    const parts = await prisma.conversationParticipant.findMany({
      where: { conversationId }, select: { readReceiptsEnabled: true },
    });
    const receiptsVisible = parts.every(p => p.readReceiptsEnabled !== false);
    const io = req.app.get('io');
    if (receiptsVisible) {
      io.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, readerId: req.user.id });
    }
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

module.exports = { getConversations, startConversation, getMessages, sendMessage, sendAudioMessage, sendImageMessage, markRead, getTotalUnread, setReaction, unsendMessage, sharePrayerRequest, updateConversationSettings, getConversationMedia };
