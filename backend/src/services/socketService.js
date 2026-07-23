const prisma = require('../db');

const connectedUsers = new Map();

// Best-effort DB cleanup when a live-session participant vanishes (tab close /
// disconnect / explicit leave). Marks them left and, if the room is now empty,
// ends the session and banks its duration into the cell's running stats. The
// REST leave endpoint does the same on graceful exit; this covers hard drops.
async function cleanupSessionParticipant(io, cellId, userId) {
  try {
    const session = await prisma.prayerCellSession.findFirst({
      where: { cellId, isActive: true },
      orderBy: { startedAt: 'desc' },
    });
    if (!session) return;
    await prisma.prayerCellSessionParticipant.updateMany({
      where: { sessionId: session.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
    const remaining = await prisma.prayerCellSessionParticipant.count({
      where: { sessionId: session.id, leftAt: null },
    });
    if (remaining === 0) {
      const endedAt = new Date();
      const minutes = Math.max(0, Math.round((endedAt - new Date(session.startedAt)) / 60000));
      await prisma.$transaction([
        prisma.prayerCellSession.update({ where: { id: session.id }, data: { isActive: false, endedAt } }),
        prisma.prayerCell.update({
          where: { id: cellId },
          data: { totalSessions: { increment: 1 }, totalMinutes: { increment: minutes }, lastActiveAt: endedAt },
        }),
      ]);
    }
    io.emit('cell:directory_updated');
  } catch (err) {
    console.error('cleanupSessionParticipant:', err);
  }
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) connectedUsers.set(userId, socket.id);

    // Join a conversation room for real-time chat
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId, userName }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', { userName });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('stop_typing');
    });

    // Prayer Cell WebRTC Signaling
    socket.on('cell:host', ({ cellId }) => {
      socket.join(`cell:${cellId}`);
      socket.data.cellId = cellId;
      socket.data.role = 'host';
      io.emit('cell:directory_updated');
    });

    socket.on('cell:join', ({ cellId }) => {
      socket.join(`cell:${cellId}`);
      socket.data.cellId = cellId;
      socket.data.role = 'guest';
      socket.to(`cell:${cellId}`).emit('cell:guest_joined', { guestSocketId: socket.id });
    });

    socket.on('cell:offer', ({ offer, targetSocketId }) => {
      io.to(targetSocketId).emit('cell:offer', { offer, fromSocketId: socket.id });
    });

    socket.on('cell:answer', ({ answer, targetSocketId }) => {
      io.to(targetSocketId).emit('cell:answer', { answer, fromSocketId: socket.id });
    });

    socket.on('cell:ice', ({ candidate, targetSocketId }) => {
      io.to(targetSocketId).emit('cell:ice', { candidate });
    });

    socket.on('cell:guest_left', ({ cellId }) => {
      socket.to(`cell:${cellId}`).emit('cell:guest_left');
      io.emit('cell:directory_updated');
    });

    socket.on('cell:ended', ({ cellId }) => {
      io.to(`cell:${cellId}`).emit('cell:ended');
      io.emit('cell:directory_updated');
    });

    // ---- Multi-person live prayer session (mesh WebRTC) ----
    // Room: psession:<cellId>. Glare-free join: the NEWCOMER receives the list
    // of peers already present and initiates an offer to each; existing peers
    // only ever answer. So offers flow one direction per pair.
    socket.on('session:join', ({ cellId, user }) => {
      const room = `psession:${cellId}`;
      socket.data.psCellId = cellId;
      socket.data.psUser = user;
      const existing = [];
      const clients = io.sockets.adapter.rooms.get(room) || new Set();
      for (const sid of clients) {
        const s = io.sockets.sockets.get(sid);
        if (s) existing.push({ socketId: sid, user: s.data.psUser || null });
      }
      socket.join(room);
      // Tell the newcomer who is already here (they will offer to each).
      socket.emit('session:peers', { peers: existing });
      // Tell everyone else a new peer arrived (they wait for its offer).
      socket.to(room).emit('session:peer_joined', { socketId: socket.id, user });
    });

    socket.on('session:offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('session:offer', { fromSocketId: socket.id, offer, user: socket.data.psUser || null });
    });
    socket.on('session:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('session:answer', { fromSocketId: socket.id, answer });
    });
    socket.on('session:ice', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('session:ice', { fromSocketId: socket.id, candidate });
    });
    socket.on('session:leave', ({ cellId }) => {
      const room = `psession:${cellId}`;
      socket.to(room).emit('session:peer_left', { socketId: socket.id });
      socket.leave(room);
      const uid = socket.data.psUser?.id || userId;
      socket.data.psCellId = null;
      socket.data.psUser = null;
      if (cellId && uid) cleanupSessionParticipant(io, cellId, uid);
    });

    // ---- 1:1 direct call signaling (reuses the same socket infra as messages) ----
    // Invite is routed by userId (callee may be anywhere in the app); the
    // response carries socket ids so both peers can exchange offer/answer/ice.
    socket.on('call:invite', ({ toUserId, fromUser, callType, conversationId }) => {
      notifyUser(io, toUserId, 'call:incoming', { fromUser, fromSocketId: socket.id, callType, conversationId });
    });
    socket.on('call:accept', ({ toSocketId, fromUser }) => {
      io.to(toSocketId).emit('call:accepted', { fromSocketId: socket.id, fromUser });
    });
    socket.on('call:decline', ({ toSocketId }) => {
      if (toSocketId) io.to(toSocketId).emit('call:declined');
    });
    socket.on('call:cancel', ({ toUserId }) => {
      notifyUser(io, toUserId, 'call:canceled', {});
    });
    socket.on('call:end', ({ toSocketId }) => {
      if (toSocketId) io.to(toSocketId).emit('call:ended');
    });
    socket.on('call:offer', ({ toSocketId, offer }) => {
      io.to(toSocketId).emit('call:offer', { offer, fromSocketId: socket.id });
    });
    socket.on('call:answer', ({ toSocketId, answer }) => {
      io.to(toSocketId).emit('call:answer', { answer });
    });
    socket.on('call:ice', ({ toSocketId, candidate }) => {
      if (toSocketId) io.to(toSocketId).emit('call:ice', { candidate });
    });

    socket.on('disconnect', () => {
      if (userId) connectedUsers.delete(userId);
      if (socket.data.cellId) {
        socket.to(`cell:${socket.data.cellId}`).emit('cell:peer_disconnected');
        io.emit('cell:directory_updated');
      }
      // Multi-person session: tear down peers + mark this user left (may end it).
      if (socket.data.psCellId) {
        const cellId = socket.data.psCellId;
        socket.to(`psession:${cellId}`).emit('session:peer_left', { socketId: socket.id });
        const uid = socket.data.psUser?.id || userId;
        if (uid) cleanupSessionParticipant(io, cellId, uid);
      }
    });
  });
}

function notifyUser(io, userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
}

module.exports = { setupSocket, notifyUser };
