const connectedUsers = new Map();

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

    socket.on('disconnect', () => {
      if (userId) connectedUsers.delete(userId);
      if (socket.data.cellId) {
        socket.to(`cell:${socket.data.cellId}`).emit('cell:peer_disconnected');
        io.emit('cell:directory_updated');
      }
    });
  });
}

function notifyUser(io, userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
}

module.exports = { setupSocket, notifyUser };
