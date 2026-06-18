const connectedUsers = new Map();

function setupSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      connectedUsers.set(userId, socket.id);
    }

    socket.on('disconnect', () => {
      if (userId) connectedUsers.delete(userId);
    });
  });
}

function notifyUser(io, userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

module.exports = { setupSocket, notifyUser };
