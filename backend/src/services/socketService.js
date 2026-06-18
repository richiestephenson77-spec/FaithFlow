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

    socket.on('disconnect', () => {
      if (userId) connectedUsers.delete(userId);
    });
  });
}

function notifyUser(io, userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
}

module.exports = { setupSocket, notifyUser };
