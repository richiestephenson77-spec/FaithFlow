require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { setupSocket } = require('./services/socketService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const prayerRoutes = require('./routes/prayers');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const churchRoutes = require('./routes/churches');
const bibleBotRoutes = require('./routes/bibleBot');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

setupSocket(io);
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/bible-bot', bibleBotRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`FaithFlow server running on port ${PORT}`));
