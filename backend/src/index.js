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
const searchRoutes = require('./routes/search');

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
].filter(Boolean);

// This app has only ONE backend deployment — Railway's "production"
// environment (RAILWAY_ENVIRONMENT=production; Railway never sets NODE_ENV,
// confirmed empirically on the live service). The native live-reload app
// points directly at this same URL, not a separate dev backend. So gating
// on NODE_ENV/RAILWAY_ENVIRONMENT would make the dev-origin allowance a
// permanent no-op — verified live: it did. Use an explicit opt-in var
// instead, defaulting to OFF, so production CORS is UNCHANGED unless this
// is deliberately set on the Railway service.
const allowDevOrigins = process.env.ALLOW_DEV_ORIGINS === 'true';

// Dev-only, live-reload origins: the Capacitor app's capacitor.config.ts
// server.url points at the dev machine's LAN IP, which changes on every new
// DHCP lease (wifi reconnect, network switch, etc). Rather than hardcoding
// one IP and re-editing this file each time it changes, allow any private-
// network origin — but ONLY when ALLOW_DEV_ORIGINS=true is explicitly set.
const DEV_PRIVATE_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/,
];

function corsOriginCheck(origin, callback) {
  // No Origin header (curl, server-to-server) isn't a browser CORS request —
  // the server doesn't need to allow it via CORS headers to let it through.
  if (allowedOrigins.includes(origin)) return callback(null, true);
  if (allowDevOrigins && origin && DEV_PRIVATE_ORIGIN_PATTERNS.some((re) => re.test(origin))) {
    return callback(null, true);
  }
  callback(null, false);
}

const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
  },
});

setupSocket(io);
app.set('io', io);

app.use(cors({ origin: corsOriginCheck }));
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
app.use('/api/search', searchRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`FaithBridge server running on port ${PORT}`));
