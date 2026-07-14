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
const messageRoutes = require('./routes/messages');
const confessionRoutes = require('./routes/confessions');
const pastorRoutes = require('./routes/pastors');
const quotaRoutes = require('./routes/quota');
const supportRoutes = require('./routes/support');
const prayerCellRoutes = require('./routes/prayerCells');
const findChurchesRoutes = require('./routes/findChurches');
const bibleRoutes = require('./routes/bible');
const prayerPartnersRoutes = require('./routes/prayerPartners');
const gratitudeRoutes = require('./routes/gratitude');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://faith-flow-nu.vercel.app',
  'https://faithflow.vercel.app',
  // Native Capacitor app runs in a WKWebView with these origins
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  // Live-reload dev: capacitor.config.ts server.url points the native app at
  // the dev machine's LAN IP. This changes if the machine reconnects to
  // wifi/gets a new DHCP lease — update here (or set DEV_LAN_ORIGIN) if
  // live-reload CORS breaks again after a network change.
  'http://192.168.1.146:3000',
  process.env.DEV_LAN_ORIGIN,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

setupSocket(io);
app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/bible-bot', bibleBotRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/confessions', confessionRoutes);
app.use('/api/pastors', pastorRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/prayer-cells', prayerCellRoutes);
app.use('/api/find-churches', findChurchesRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/prayer-partners', prayerPartnersRoutes);
app.use('/api/gratitude', gratitudeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`FaithBridge server running on port ${PORT}`));
